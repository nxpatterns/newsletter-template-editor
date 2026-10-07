import { Injectable, signal } from '@angular/core';

export type SnackbarTone = 'info' | 'success' | 'error';

export interface SnackbarMessage {
  id: number;
  text: string;
  tone: SnackbarTone;
  durationMs: number;
}

/** Default auto-dismiss. UI-configurable later. */
export const SNACKBAR_DEFAULT_DURATION_MS = 3000;

const DEFAULT_DURATION: Record<SnackbarTone, number> = {
  info: SNACKBAR_DEFAULT_DURATION_MS,
  success: SNACKBAR_DEFAULT_DURATION_MS,
  error: SNACKBAR_DEFAULT_DURATION_MS,
};

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private seq = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private startedAt = 0;
  private paused = false;

  /** Single-slot current message (null = hidden). */
  readonly message = signal<SnackbarMessage | null>(null);

  /** true while hover/focus pauses the countdown (drives progress animation). */
  readonly timerPaused = signal(false);

  show(text: string, tone: SnackbarTone = 'info', durationMs = DEFAULT_DURATION[tone]): void {
    this.clearTimer();
    this.paused = false;
    this.timerPaused.set(false);
    const id = ++this.seq;
    const ms = durationMs > 0 ? durationMs : 0;
    this.remainingMs = ms;
    this.message.set({ id, text, tone, durationMs: ms });
    if (ms > 0) this.armTimer(id, ms);
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

  dismiss(id?: number): void {
    const current = this.message();
    if (!current) return;
    if (id !== undefined && current.id !== id) return;
    this.clearTimer();
    this.paused = false;
    this.timerPaused.set(false);
    this.remainingMs = 0;
    this.message.set(null);
  }

  /** Pause auto-dismiss while hovered/focused; keeps remaining time. */
  pauseTimer(): void {
    if (this.paused) return;
    const current = this.message();
    if (!current || current.durationMs <= 0) return;
    if (this.startedAt > 0) {
      const elapsed = Date.now() - this.startedAt;
      this.remainingMs = Math.max(0, this.remainingMs - elapsed);
    }
    this.clearTimer();
    this.paused = true;
    this.timerPaused.set(true);
  }

  /** Resume auto-dismiss with the leftover duration. */
  resumeTimer(): void {
    if (!this.paused) return;
    this.paused = false;
    this.timerPaused.set(false);
    const current = this.message();
    if (!current || this.remainingMs <= 0) {
      if (current) this.dismiss(current.id);
      return;
    }
    this.armTimer(current.id, this.remainingMs);
  }

  private armTimer(id: number, ms: number): void {
    this.clearTimer();
    this.startedAt = Date.now();
    this.remainingMs = ms;
    this.hideTimer = setTimeout(() => this.dismiss(id), ms);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.startedAt = 0;
  }
}
