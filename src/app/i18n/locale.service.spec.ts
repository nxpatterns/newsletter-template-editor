import { TestBed } from '@angular/core/testing';
import { DE } from './catalogs/de';
import { EN } from './catalogs/en';
import { LocaleService } from './locale.service';
import { LOCALE_STORAGE_KEY } from './types';

/** Seller-facing inspector / brand / legal labels — must not advertise raw HTML. */
const SELLER_FIELD_KEYS = [
  'field.headlineHtml',
  'field.paragraphHtml',
  'field.chapterTitle',
  'field.quoteHtml',
  'field.statGeo',
  'brand.name',
  'legal.notice',
  'block.paragraph.hint',
] as const;

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  it('defaults to English and translates shell title', () => {
    const i18n = TestBed.inject(LocaleService);
    expect(i18n.locale()).toBe('en');
    expect(i18n.t('shell.title')).toContain('Newsletter');
  });

  it('switches to German and persists', async () => {
    const i18n = TestBed.inject(LocaleService);
    await i18n.setLocale('de');
    expect(i18n.locale()).toBe('de');
    expect(i18n.t('action.save')).toBe('Speichern');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('keeps seller field labels free of an (HTML) suffix', () => {
    for (const key of SELLER_FIELD_KEYS) {
      expect(EN[key], `en ${key}`).toBeTruthy();
      expect(DE[key], `de ${key}`).toBeTruthy();
      expect(EN[key]).not.toMatch(/\(HTML\)/i);
      expect(DE[key]).not.toMatch(/\(HTML\)/i);
    }
  });
});
