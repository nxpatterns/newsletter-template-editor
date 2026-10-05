import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale.service';
import { LOCALE_STORAGE_KEY } from './types';

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

  it('switches to German and persists', () => {
    const i18n = TestBed.inject(LocaleService);
    i18n.setLocale('de');
    expect(i18n.locale()).toBe('de');
    expect(i18n.t('action.save')).toBe('Speichern');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });
});
