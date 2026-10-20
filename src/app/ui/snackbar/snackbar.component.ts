import { Component, HostListener, inject } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { SnackbarService, SnackbarTone } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);
  private readonly i18n = inject(LocaleService);

  protected get dismissLabel(): string {
    return this.i18n.t('snackbar.dismiss');
  }

  protected get olderLabel(): string {
    return this.i18n.t('snackbar.older');
  }

  protected get newerLabel(): string {
    return this.i18n.t('snackbar.newer');
  }

  protected toneLabel(tone: SnackbarTone): string {
    return this.i18n.t(`snackbar.tone.${tone}`);
  }

  protected dismiss(): void {
    this.snackbar.dismiss();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.snackbar.message()) {
      this.snackbar.dismiss();
    }
  }
}
