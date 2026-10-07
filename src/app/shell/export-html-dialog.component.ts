import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { LocaleService } from '../i18n/locale.service';

export type HtmlExportKind = 'full' | 'listmonk';

@Component({
  selector: 'app-export-html-dialog',
  templateUrl: './export-html-dialog.component.html',
  styleUrl: './export-html-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ExportHtmlDialogComponent {
  protected readonly i18n = inject(LocaleService);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly chosen = output<HtmlExportKind>();

  protected readonly openVisual = signal(false);
  protected readonly kind = signal<HtmlExportKind>('full');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.kind.set('full');
        requestAnimationFrame(() => this.openVisual.set(true));
      } else {
        this.openVisual.set(false);
      }
    });
  }

  protected onEscape(): void {
    if (this.open()) this.requestClose();
  }

  protected requestClose(): void {
    this.openVisual.set(false);
    window.setTimeout(() => this.closed.emit(), 180);
  }

  protected select(kind: HtmlExportKind): void {
    this.kind.set(kind);
  }

  protected confirm(): void {
    const k = this.kind();
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.chosen.emit(k);
      this.closed.emit();
    }, 180);
  }
}
