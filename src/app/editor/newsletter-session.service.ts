import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  loadOrSeed,
  resetToSeed,
  saveNewsletter,
  seedNewsletter,
  type Newsletter,
} from '../../core';
import { LocaleService } from '../i18n/locale.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

@Injectable({ providedIn: 'root' })
export class NewsletterSession {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly snackbar = inject(SnackbarService);
  private readonly i18n = inject(LocaleService);

  private readonly newsletterSignal = signal<Newsletter>(seedNewsletter());

  readonly newsletter = this.newsletterSignal.asReadonly();

  hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const loaded = loadOrSeed(seedNewsletter);
    this.newsletterSignal.set(loaded);
    saveNewsletter(loaded);
  }

  save(): void {
    saveNewsletter(this.newsletterSignal());
    this.snackbar.success(this.i18n.t('snackbar.saved'));
  }

  resetSeed(): void {
    const next = resetToSeed(seedNewsletter);
    this.newsletterSignal.set(next);
    this.snackbar.success(this.i18n.t('snackbar.reset'));
  }
}
