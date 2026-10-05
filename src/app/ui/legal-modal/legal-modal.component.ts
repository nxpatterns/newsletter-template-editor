import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { celebrateBmc } from './bmc-celebrate';

export type LegalModalKind = 'impressum' | 'privacy' | null;

@Component({
  selector: 'app-legal-modal',
  templateUrl: './legal-modal.component.html',
  styleUrl: './legal-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class LegalModalComponent {
  protected readonly i18n = inject(LocaleService);

  readonly kind = input<LegalModalKind>(null);
  readonly closed = output<void>();

  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  /** Drives enter/leave CSS classes. */
  protected readonly openVisual = signal(false);
  private closing = false;
  private bmcArmed = true;

  constructor() {
    effect(() => {
      const kind = this.kind();
      if (kind) {
        this.closing = false;
        // next frame so CSS transition runs
        requestAnimationFrame(() => this.openVisual.set(true));
        queueMicrotask(() => this.closeBtn()?.nativeElement.focus());
      } else if (this.openVisual()) {
        this.beginClose();
      }
    });
  }

  protected titleKey(): string {
    return this.kind() === 'privacy' ? 'privacy.title' : 'impressum.title';
  }

  protected onBackdropClick(): void {
    this.requestClose();
  }

  protected requestClose(): void {
    if (!this.kind() || this.closing) return;
    this.beginClose();
  }

  protected onBmcEnter(event: Event): void {
    if (!this.bmcArmed) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    this.bmcArmed = false;
    celebrateBmc(target);
    window.setTimeout(() => {
      this.bmcArmed = true;
    }, 1100);
  }

  protected onEscape(): void {
    if (this.kind()) this.requestClose();
  }

  private beginClose(): void {
    this.closing = true;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      this.closed.emit();
    }, 280);
  }
}
