import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
}

export interface PromptDialogRequest {
  title: string;
  body?: string;
  inputLabel: string;
  initialValue: string;
  confirmLabel: string;
  cancelLabel: string;
}

type PendingConfirm = ConfirmDialogRequest & {
  mode: 'confirm';
  resolve: (value: boolean) => void;
};

type PendingPrompt = PromptDialogRequest & {
  mode: 'prompt';
  resolve: (value: string | null) => void;
};

type Pending = PendingConfirm | PendingPrompt;

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly pendingSignal = signal<Pending | null>(null);

  readonly pending = this.pendingSignal.asReadonly();

  confirm(req: ConfirmDialogRequest): Promise<boolean> {
    this.rejectCurrent();
    return new Promise<boolean>((resolve) => {
      this.pendingSignal.set({ ...req, mode: 'confirm', resolve });
    });
  }

  prompt(req: PromptDialogRequest): Promise<string | null> {
    this.rejectCurrent();
    return new Promise<string | null>((resolve) => {
      this.pendingSignal.set({ ...req, mode: 'prompt', resolve });
    });
  }

  completeConfirm(result: boolean): void {
    const p = this.pendingSignal();
    if (!p || p.mode !== 'confirm') return;
    this.pendingSignal.set(null);
    p.resolve(result);
  }

  completePrompt(result: string | null): void {
    const p = this.pendingSignal();
    if (!p || p.mode !== 'prompt') return;
    this.pendingSignal.set(null);
    p.resolve(result);
  }

  private rejectCurrent(): void {
    const current = this.pendingSignal();
    if (!current) return;
    if (current.mode === 'confirm') current.resolve(false);
    else current.resolve(null);
    this.pendingSignal.set(null);
  }
}
