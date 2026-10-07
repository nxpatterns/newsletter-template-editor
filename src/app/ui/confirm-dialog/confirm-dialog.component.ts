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
  private closing = false;

  constructor() {
    effect(() => {
      const p = this.confirm.pending();
      if (p) {
        this.closing = false;
        this.promptValue.set(p.mode === 'prompt' ? p.initialValue : '');
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
    this.beginClose(true);
  }

  protected onEscape(): void {
    if (this.confirm.pending()) this.beginClose(false);
  }

  protected onPromptInput(event: Event): void {
    this.promptValue.set((event.target as HTMLInputElement).value);
  }

  private beginClose(ok: boolean): void {
    const p = this.confirm.pending();
    if (!p || this.closing) return;
    this.closing = true;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      if (p.mode === 'prompt') {
        const v = this.promptValue().trim();
        this.confirm.completePrompt(ok && v ? v : null);
      } else {
        this.confirm.completeConfirm(ok);
      }
    }, 200);
  }
}
