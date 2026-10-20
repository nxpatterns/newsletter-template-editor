import { Injectable, computed, signal } from '@angular/core';

export type SnackbarTone = 'info' | 'success' | 'error';

export interface SnackbarMessage {
  id: number;
  text: string;
  tone: SnackbarTone;
  durationMs: number;
  /** Optional button next to the text, e.g. "Undo"; clicking it runs `run` and closes the message. */
  action?: SnackbarAction;
}

export interface SnackbarAction {
  label: string;
  run: () => void;
}

/** Default auto-dismiss. UI-configurable later. */
export const SNACKBAR_DEFAULT_DURATION_MS = 3000;

/** Older messages stay reachable by paging back; never more than this many are kept. */
export const SNACKBAR_MAX_KEPT = 10;

const DEFAULT_DURATION: Record<SnackbarTone, number> = {
  info: SNACKBAR_DEFAULT_DURATION_MS,
  success: SNACKBAR_DEFAULT_DURATION_MS,
  error: SNACKBAR_DEFAULT_DURATION_MS,
};

/** Auto-dismiss countdown of one kept message. */
interface Countdown {
  handle: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private seq = 0;
  private paused = false;
  private readonly countdowns = new Map<number, Countdown>();
  private readonly items = signal<SnackbarMessage[]>([]);
  /** Message paged to with older/newer; null = follow the newest. */
  private readonly selectedId = signal<number | null>(null);

  /** Kept messages, oldest first (at most SNACKBAR_MAX_KEPT). Only one is on screen. */
  readonly messages = this.items.asReadonly();

  /** Message on screen (null = hidden): the one paged to, else the newest. */
  readonly message = computed(() => {
    const list = this.items();
    const id = this.selectedId();
    return list.find((m) => m.id === id) ?? list.at(-1) ?? null;
  });

  /** 1-based position of the shown message within `messages` (0 = hidden). */
  readonly position = computed(() => {
    const current = this.message();
    return current ? this.items().indexOf(current) + 1 : 0;
  });

  /** true while hover/focus pauses the countdown (drives progress animation). */
  readonly timerPaused = signal(false);

  show(text: string, tone: SnackbarTone = 'info', durationMs = DEFAULT_DURATION[tone], action?: SnackbarAction): void {
    const id = ++this.seq;
    const ms = durationMs > 0 ? durationMs : 0;
    const next = [...this.items(), { id, text, tone, durationMs: ms, ...(action ? { action } : {}) }];
    for (const dropped of next.splice(0, Math.max(0, next.length - SNACKBAR_MAX_KEPT))) {
      this.clearCountdown(dropped.id);
    }
    this.items.set(next);
    this.selectedId.set(null);
    if (ms > 0) {
      const countdown: Countdown = { handle: null, remainingMs: ms, startedAt: 0 };
      this.countdowns.set(id, countdown);
      // While hovered, a new message waits too; it starts with the others on resume.
      if (!this.paused) this.arm(id, countdown);
    }
  }

  success(text: string, durationMs?: number): void {
    this.show(text, 'success', durationMs ?? DEFAULT_DURATION.success);
  }

  error(text: string, durationMs?: number): void {
    this.show(text, 'error', durationMs ?? DEFAULT_DURATION.error);
  }

  info(text: string, durationMs?: number): void {
    this.show(text, 'info', durationMs ?? DEFAULT_DURATION.info);
  }

  /** Runs the shown message's action, then closes it. */
  runAction(): void {
    const current = this.message();
    if (!current?.action) return;
    this.dismiss(current.id);
    current.action.run();
  }

  /** Closes the message with `id`, or the shown one; an older kept message then takes its place. */
  dismiss(id?: number): void {
    const target = id ?? this.message()?.id;
    if (target === undefined || !this.items().some((m) => m.id === target)) return;
    this.clearCountdown(target);
    this.items.update((list) => list.filter((m) => m.id !== target));
    if (this.selectedId() === target) this.selectedId.set(null);
    if (this.items().length === 0) {
      this.paused = false;
      this.timerPaused.set(false);
    }
  }

  /** Pages to the next older kept message. */
  showOlder(): void {
    this.step(-1);
  }

  /** Pages to the next newer kept message. */
  showNewer(): void {
    this.step(1);
  }

  /** Pause auto-dismiss of all kept messages while hovered/focused; keeps remaining time. */
  pauseTimer(): void {
    if (this.paused || this.countdowns.size === 0) return;
    const now = Date.now();
    for (const countdown of this.countdowns.values()) {
      if (countdown.handle !== null) {
        clearTimeout(countdown.handle);
        countdown.handle = null;
        countdown.remainingMs = Math.max(0, countdown.remainingMs - (now - countdown.startedAt));
      }
    }
    this.paused = true;
    this.timerPaused.set(true);
  }

  /** Resume auto-dismiss with each message's leftover duration. */
  resumeTimer(): void {
    if (!this.paused) return;
    this.paused = false;
    this.timerPaused.set(false);
    for (const [id, countdown] of [...this.countdowns]) {
      if (countdown.remainingMs <= 0) this.dismiss(id);
      else this.arm(id, countdown);
    }
  }

  private step(delta: number): void {
    const list = this.items();
    const target = list[this.position() - 1 + delta];
    if (!target) return;
    this.selectedId.set(target === list.at(-1) ? null : target.id);
  }

  private arm(id: number, countdown: Countdown): void {
    countdown.startedAt = Date.now();
    countdown.handle = setTimeout(() => this.dismiss(id), countdown.remainingMs);
  }

  private clearCountdown(id: number): void {
    const countdown = this.countdowns.get(id);
    if (countdown?.handle != null) clearTimeout(countdown.handle);
    this.countdowns.delete(id);
  }
}
