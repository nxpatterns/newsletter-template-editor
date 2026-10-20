import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  /** When set, a checkbox with this text must be ticked before confirming (irreversible actions). */
  acknowledge?: string;
  /** Warning look (tinted head, ⚠) for actions that delete data for good. */
  warning?: boolean;
  /** Highlighted hint under the text, e.g. "export your files first". */
  note?: string;
}

export interface PromptDialogRequest {
  title: string;
  body?: string;
  inputLabel: string;
  initialValue: string;
  confirmLabel: string;
  cancelLabel: string;
}

/** Three-way question, e.g. unsaved changes: Save / Discard / Cancel. */
export interface ChoiceDialogRequest {
  title: string;
  body: string;
  confirmLabel: string;
  altLabel: string;
  cancelLabel: string;
}

export type ChoiceResult = 'confirm' | 'alt' | 'cancel';

type PendingChoice = ChoiceDialogRequest & {
  mode: 'choice';
  danger?: undefined;
  resolve: (value: ChoiceResult) => void;
};

type PendingConfirm = ConfirmDialogRequest & {
  mode: 'confirm';
  resolve: (value: boolean) => void;
};

type PendingPrompt = PromptDialogRequest & {
  mode: 'prompt';
  resolve: (value: string | null) => void;
};

type Pending = PendingConfirm | PendingPrompt | PendingChoice;

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

  choose(req: ChoiceDialogRequest): Promise<ChoiceResult> {
    this.rejectCurrent();
    return new Promise<ChoiceResult>((resolve) => {
      this.pendingSignal.set({ ...req, mode: 'choice', resolve });
    });
  }

  completeChoice(result: ChoiceResult): void {
    const p = this.pendingSignal();
    if (!p || p.mode !== 'choice') return;
    this.pendingSignal.set(null);
    p.resolve(result);
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
    else if (current.mode === 'choice') current.resolve('cancel');
    else current.resolve(null);
    this.pendingSignal.set(null);
  }
}
