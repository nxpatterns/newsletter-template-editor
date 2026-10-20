import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmDialogService);

  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('promptInput');

  protected readonly openVisual = signal(false);
  protected readonly promptValue = signal('');
  protected readonly acknowledged = signal(false);
  private closing = false;

  constructor() {
    effect(() => {
      const p = this.confirm.pending();
      if (p) {
        this.closing = false;
        this.promptValue.set(p.mode === 'prompt' ? p.initialValue : '');
        this.acknowledged.set(false);
        requestAnimationFrame(() => this.openVisual.set(true));
        queueMicrotask(() => {
          if (p.mode === 'prompt') this.inputEl()?.nativeElement.focus();
          else this.cancelBtn()?.nativeElement.focus();
        });
      } else {
        this.openVisual.set(false);
      }
    });
  }

  protected onBackdrop(): void {
    this.beginClose(false);
  }

  protected onCancel(): void {
    this.beginClose(false);
  }

  protected onConfirm(): void {
    if (this.needsAcknowledge()) return;
    this.beginClose(true);
  }

  protected onEscape(): void {
    if (this.confirm.pending()) this.beginClose(false);
  }

  protected onPromptInput(event: Event): void {
    this.promptValue.set((event.target as HTMLInputElement).value);
  }

  protected onAcknowledge(event: Event): void {
    this.acknowledged.set((event.target as HTMLInputElement).checked);
  }

  /** Confirm stays disabled until the required checkbox is ticked. */
  protected needsAcknowledge(): boolean {
    const p = this.confirm.pending();
    return !!p && p.mode === 'confirm' && !!p.acknowledge && !this.acknowledged();
  }

  protected onAlt(): void {
    this.beginClose('alt');
  }

  private beginClose(ok: boolean | 'alt'): void {
    const p = this.confirm.pending();
    if (!p || this.closing) return;
    this.closing = true;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      if (p.mode === 'prompt') {
        const v = this.promptValue().trim();
        this.confirm.completePrompt(ok && v ? v : null);
      } else if (p.mode === 'choice') {
        this.confirm.completeChoice(ok === 'alt' ? 'alt' : ok ? 'confirm' : 'cancel');
      } else {
        this.confirm.completeConfirm(ok === true);
      }
    }, 200);
  }
}
