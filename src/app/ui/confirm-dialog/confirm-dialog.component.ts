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

  protected readonly openVisual = signal(false);
  private closing = false;

  constructor() {
    effect(() => {
      const p = this.confirm.pending();
      if (p) {
        this.closing = false;
        requestAnimationFrame(() => this.openVisual.set(true));
        queueMicrotask(() => this.cancelBtn()?.nativeElement.focus());
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

  private beginClose(result: boolean): void {
    if (!this.confirm.pending() || this.closing) return;
    this.closing = true;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      this.confirm.complete(result);
    }, 200);
  }
}
