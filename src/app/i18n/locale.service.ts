import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { CATALOGS, FALLBACK_CATALOG, LOCALES } from './catalogs';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, type MessageCatalog } from './types';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly localeSignal = signal<Locale>(DEFAULT_LOCALE);

  /** Catalogs loaded so far; the locale signal only switches once its catalog is here. */
  private readonly loaded: Partial<Record<Locale, MessageCatalog>> = { en: FALLBACK_CATALOG };

  /** Counts switches, so a slow catalog load cannot override a later choice. */
  private switches = 0;

  /** Active UI locale. */
  readonly locale = this.localeSignal.asReadonly();

  /** Resolves once the stored locale's catalog is loaded and active. */
  readonly ready: Promise<void>;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.ready = Promise.resolve();
      return;
    }
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const initial = this.parseLocale(stored) ?? DEFAULT_LOCALE;
    this.ready = this.apply(initial, false);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const catalog = this.loaded[this.localeSignal()] ?? FALLBACK_CATALOG;
    let msg = catalog[key] ?? FALLBACK_CATALOG[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replaceAll(`{${k}}`, String(v));
      }
    }
    return msg;
  }

  /** Switches the UI language; resolves when the new catalog is active. */
  async setLocale(next: Locale): Promise<void> {
    if (!LOCALES.includes(next)) return;
    await this.apply(next, true);
  }

  private async apply(next: Locale, persist: boolean): Promise<void> {
    const switchNo = ++this.switches;
    this.loaded[next] ??= await CATALOGS[next]();
    if (switchNo !== this.switches) return;
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
