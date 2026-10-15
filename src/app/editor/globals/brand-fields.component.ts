import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  displaySizeFromHeight,
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
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly busy = signal(false);

  protected onBrand(key: 'starsText' | 'nameHtml', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateBrand({ [key]: value }, 'coalesce');
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
