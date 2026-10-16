import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { filledSocialNetworks, isAssetBaseUrl, placeholderParts } from '../../core';
import { NewsletterSession } from '../editor/newsletter-session.service';
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
  private readonly session = inject(NewsletterSession);
  /** Dummy logo / example.com links still in use (blank newsletter): warn before download. */
  protected readonly placeholders = computed(() => placeholderParts(this.session.newsletter()));
  /** Social icons need a public place for their PNGs; without one the footer uses text links. */
  protected readonly hasSocial = computed(() => filledSocialNetworks(this.session.globals().legal.social).length > 0);
  protected readonly assetBase = computed(() => this.session.globals().assetBaseUrl);
  protected readonly assetBaseValid = computed(() => isAssetBaseUrl(this.assetBase()));

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

  protected onAssetBase(event: Event): void {
    this.session.updateGlobals({ assetBaseUrl: (event.target as HTMLInputElement).value.trim() }, 'coalesce');
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
