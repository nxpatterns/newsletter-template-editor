import { Injectable, signal } from '@angular/core';

export type SnackbarTone = 'info' | 'success' | 'error';

export interface SnackbarMessage {
  id: number;
  text: string;
  tone: SnackbarTone;
  durationMs: number;
}

const DEFAULT_DURATION: Record<SnackbarTone, number> = {
  info: 4000,
  success: 4000,
  error: 6000,
};

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private seq = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Single-slot current message (null = hidden). */
  readonly message = signal<SnackbarMessage | null>(null);

  show(
    text: string,
    tone: SnackbarTone = 'info',
    durationMs = DEFAULT_DURATION[tone],
  ): void {
    this.clearTimer();
    const id = ++this.seq;
    this.message.set({ id, text, tone, durationMs });
    if (durationMs > 0) {
      this.hideTimer = setTimeout(() => this.dismiss(id), durationMs);
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

  dismiss(id?: number): void {
    const current = this.message();
    if (!current) return;
    if (id !== undefined && current.id !== id) return;
    this.clearTimer();
    this.message.set(null);
  }

  /** Pause auto-dismiss while hovered/focused. */
  pauseTimer(): void {
    this.clearTimer();
  }

  /** Resume auto-dismiss from full duration of current message. */
  resumeTimer(): void {
    const current = this.message();
    if (!current || current.durationMs <= 0) return;
    this.clearTimer();
    const id = current.id;
    this.hideTimer = setTimeout(() => this.dismiss(id), current.durationMs);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
