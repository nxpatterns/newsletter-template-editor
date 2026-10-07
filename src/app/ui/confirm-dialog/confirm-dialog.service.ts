import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Prefer danger styling on confirm (replace/clear). */
  danger?: boolean;
}

interface Pending extends ConfirmDialogRequest {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly pendingSignal = signal<Pending | null>(null);

  readonly pending = this.pendingSignal.asReadonly();

  /** Opens the app confirm modal. Resolves true on confirm, false on cancel/backdrop/escape. */
  confirm(req: ConfirmDialogRequest): Promise<boolean> {
    const current = this.pendingSignal();
    if (current) {
      current.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      this.pendingSignal.set({ ...req, resolve });
    });
  }

  complete(result: boolean): void {
    const p = this.pendingSignal();
    if (!p) return;
    this.pendingSignal.set(null);
    p.resolve(result);
  }
}
