import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  BRAND_NAME_SIZES,
  BRAND_STAR_MAX,
  BRAND_STAR_SYMBOLS,
  detectLinkKind,
  displaySizeFromHeight,
  normalizeLinkTarget,
  type BrandName,
  type BrandStars,
  intakeLogoFile,
  LogoPipelineError,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { ImagePickerComponent, type ImageSize } from '../image-picker/image-picker.component';
import { ConfirmDialogService } from '../../ui/confirm-dialog/confirm-dialog.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-brand-fields',
  imports: [ImagePickerComponent],
  templateUrl: './brand-fields.component.html',
  styleUrl: './brand-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly busy = signal(false);

  protected readonly nameSizes = BRAND_NAME_SIZES;
  protected readonly starMax = BRAND_STAR_MAX;
  /** The fixed choices, plus a symbol carried over from an older template. */
  protected readonly starSymbols = computed(() => {
    const current = this.session.globals().brand.stars.symbol;
    return (BRAND_STAR_SYMBOLS as readonly string[]).includes(current)
      ? [...BRAND_STAR_SYMBOLS]
      : [...BRAND_STAR_SYMBOLS, current];
  });

  protected updateName(patch: Partial<BrandName>, history: 'immediate' | 'coalesce' = 'immediate'): void {
    this.session.updateBrand({ name: { ...this.session.globals().brand.name, ...patch } }, history);
  }

  protected updateStars(patch: Partial<BrandStars>): void {
    const stars = { ...this.session.globals().brand.stars, ...patch };
    stars.count = Math.max(0, Math.min(BRAND_STAR_MAX, stars.count));
    this.session.updateBrand({ stars }, 'immediate');
  }

  private patchPart(index: number, patch: Partial<BrandName['parts'][number]>): void {
    const parts = this.session.globals().brand.name.parts.map((p, i) => (i === index ? { ...p, ...patch } : p));
    this.updateName({ parts }, 'coalesce');
  }

  protected onPartText(index: number, event: Event): void {
    this.patchPart(index, { text: (event.target as HTMLInputElement).value });
  }

  protected onPartColor(index: number, event: Event): void {
    this.patchPart(index, { color: (event.target as HTMLInputElement).value });
  }

  /** A new part starts with the last part's color, so it blends in until changed. */
  protected addPart(): void {
    const parts = this.session.globals().brand.name.parts;
    this.updateName({ parts: [...parts, { text: '', color: parts.at(-1)?.color ?? '#4db8ff' }] });
  }

  protected removePart(index: number): void {
    const parts = this.session.globals().brand.name.parts;
    if (parts.length < 2) return;
    this.updateName({ parts: parts.filter((_, i) => i !== index) });
  }

  /** i18n key of the link type the address looks like, for the hint chip. */
  protected linkKindKey(href: string): string | null {
    const kind = detectLinkKind(href);
    return kind ? `rt.linkForm.type.${kind}` : null;
  }

  protected onLogoLinkTargetBlur(): void {
    this.session.endCoalesce();
    const built = normalizeLinkTarget(this.session.globals().logo.href ?? '');
    if (built) this.session.updateLogo({ href: built }, 'immediate');
  }

  protected onLogo(key: 'src' | 'href' | 'alt', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateLogo({ [key]: value }, 'coalesce');
  }

  protected onLogoHeight(event: Event): void {
    const heightPx = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(heightPx)) return;
    const logo = this.session.globals().logo;
    const size = displaySizeFromHeight(heightPx, logo.naturalWidth, logo.naturalHeight);
    this.session.updateLogo(size, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  /** A hosted logo works in every mail program; its pixel size arrives once it has loaded. */
  protected onLogoUrl(src: string): void {
    this.session.updateLogo(
      { src, widthPx: undefined, naturalWidth: undefined, naturalHeight: undefined },
      'coalesce',
    );
  }

  protected onLogoLoaded(size: ImageSize): void {
    const logo = this.session.globals().logo;
    if (logo.naturalWidth === size.width && logo.naturalHeight === size.height) return;
    const display = displaySizeFromHeight(logo.heightPx, size.width, size.height);
    this.session.updateLogo({ ...display, naturalWidth: size.width, naturalHeight: size.height }, 'coalesce');
    this.session.endCoalesce();
  }

  protected async clearLogo(): Promise<void> {
    if (!this.session.globals().logo.src) return;
    const ok = await this.confirmDialog.confirm({
      title: this.i18n.t('brand.logoClearTitle'),
      body: this.i18n.t('brand.logoClearConfirm'),
      confirmLabel: this.i18n.t('brand.logoClear'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
    if (!ok) return;
    this.session.updateLogo(
      {
        src: '',
        widthPx: undefined,
        naturalWidth: undefined,
        naturalHeight: undefined,
      },
      'immediate',
    );
  }

  protected async handleFile(file: File): Promise<void> {
    const current = this.session.globals().logo;
    if (current.src) {
      const ok = await this.confirmDialog.confirm({
        title: this.i18n.t('brand.logoReplaceTitle'),
        body: this.i18n.t('brand.logoReplaceConfirm'),
        confirmLabel: this.i18n.t('brand.logoReplaceAction'),
        cancelLabel: this.i18n.t('modal.cancel'),
        danger: true,
      });
      if (!ok) return;
    }

    this.busy.set(true);
    try {
      const result = await intakeLogoFile(file, current);
      this.session.updateLogo(result.logo, 'immediate');
    } catch (err) {
      const code = err instanceof LogoPipelineError ? err.code : 'decode_failed';
      const key =
        code === 'unsupported_type'
          ? 'image.errType'
          : code === 'too_large'
            ? 'image.errSize'
            : 'image.errGeneric';
      this.snackbar.error(this.i18n.t(key));
    } finally {
      this.busy.set(false);
    }
  }
}
