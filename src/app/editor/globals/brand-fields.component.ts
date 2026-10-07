import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  displaySizeFromHeight,
  intakeLogoFile,
  LogoPipelineError,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { ConfirmDialogService } from '../../ui/confirm-dialog/confirm-dialog.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-brand-fields',
  templateUrl: './brand-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

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

  protected pickFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.handleFile(file);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.handleFile(file);
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

  private async handleFile(file: File): Promise<void> {
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
          ? 'brand.logoErrType'
          : code === 'too_large'
            ? 'brand.logoErrSize'
            : 'brand.logoErrGeneric';
      this.snackbar.error(this.i18n.t(key));
    } finally {
      this.busy.set(false);
    }
  }
}
