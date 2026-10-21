import { LOCALES } from './catalogs';
import { languageDir, languageEntries, matchesLanguage, PLANNED_LOCALES } from './languages';

describe('languages', () => {
  it('marks exactly the languages with a catalog as active', () => {
    const entries = languageEntries('de', LOCALES, PLANNED_LOCALES);
    expect(entries.filter((e) => e.active).map((e) => e.code).sort()).toEqual([...LOCALES].sort());
    expect(entries.filter((e) => !e.active).map((e) => e.code).sort()).toEqual(['es', 'fr', 'it', 'tr']);
  });

  it('lists active languages before planned ones', () => {
    const entries = languageEntries('en', LOCALES, PLANNED_LOCALES);
    const firstPlanned = entries.findIndex((e) => !e.active);
    expect(entries.slice(firstPlanned).every((e) => !e.active)).toBe(true);
  });

  it('never lists a language twice when its catalog arrives', () => {
    const entries = languageEntries('en', ['en', 'de', 'fr'], ['fr', 'it', 'it']);
    expect(entries.map((e) => e.code).sort()).toEqual(['de', 'en', 'fr', 'it']);
    expect(entries.find((e) => e.code === 'fr')?.active).toBe(true);
  });

  it('names each language in itself and in the UI language', () => {
    const fr = languageEntries('de', [], ['fr'])[0];
    expect(fr.endonym).toBe(new Intl.DisplayNames(['fr'], { type: 'language' }).of('fr')!.replace(/^./, (c) => c.toLocaleUpperCase('fr')));
    expect(fr.localName).not.toBe(fr.endonym);
  });

  it('knows right-to-left scripts', () => {
    expect(languageDir('ar')).toBe('rtl');
    expect(languageDir('he')).toBe('rtl');
    expect(languageDir('fa-IR')).toBe('rtl');
    expect(languageDir('tr')).toBe('ltr');
    expect(languageEntries('en', [], ['ar'])[0].dir).toBe('rtl');
  });

  it('finds a language by code, own name, UI name or English name, ignoring case and accents', () => {
    const [fr] = languageEntries('de', [], ['fr']);
    for (const q of ['fr', 'FR', fr.endonym.toUpperCase(), 'francais', fr.localName, fr.englishName]) {
      expect(matchesLanguage(fr, q), q).toBe(true);
    }
    expect(matchesLanguage(fr, 'xyz')).toBe(false);
    expect(matchesLanguage(fr, '   ')).toBe(true);
  });
});
