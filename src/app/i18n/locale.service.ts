import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { CATALOGS, LOCALES } from './catalogs';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from './types';

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

  t(key: string, params?: Record<string, string | number>): string {
    const catalog = CATALOGS[this.localeSignal()];
    let msg = catalog[key] ?? CATALOGS.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replaceAll(`{${k}}`, String(v));
      }
    }
    return msg;
  }

  setLocale(next: Locale): void {
    if (!LOCALES.includes(next)) return;
    this.apply(next, true);
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
    return LOCALES.find((l) => l === value) ?? null;
  }
}
