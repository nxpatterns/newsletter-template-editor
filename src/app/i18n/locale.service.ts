import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { DE } from './catalogs/de';
import { EN } from './catalogs/en';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type Locale,
  type MessageCatalog,
  LOCALES,
} from './types';

const CATALOGS: Record<Locale, MessageCatalog> = { en: EN, de: DE };

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly localeSignal = signal<Locale>(DEFAULT_LOCALE);

  /** Active UI locale. */
  readonly locale = this.localeSignal.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const initial = this.parseLocale(stored) ?? DEFAULT_LOCALE;
    this.apply(initial, false);
  }

  t(key: string): string {
    const catalog = CATALOGS[this.localeSignal()];
    return catalog[key] ?? CATALOGS.en[key] ?? key;
  }

  setLocale(next: Locale): void {
    if (!LOCALES.includes(next)) return;
    this.apply(next, true);
  }

  toggleLocale(): void {
    this.setLocale(this.localeSignal() === 'en' ? 'de' : 'en');
  }

  private apply(next: Locale, persist: boolean): void {
    this.localeSignal.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.lang = next;
    if (persist) {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }

  private parseLocale(value: string | null): Locale | null {
    if (value === 'en' || value === 'de') return value;
    return null;
  }
}
