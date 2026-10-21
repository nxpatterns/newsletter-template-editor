import { InjectionToken } from '@angular/core';

/** Languages the menu shows as coming soon until their catalog exists. */
export const PLANNED_LOCALES: readonly string[] = ['fr', 'it', 'es', 'tr'];

export const PLANNED_LANGUAGES = new InjectionToken<readonly string[]>('PLANNED_LANGUAGES', {
  factory: () => PLANNED_LOCALES,
});

/** The language menu shows its search field from this many languages on. */
export const LANGUAGE_SEARCH_MIN = 8;

const RTL_LANGUAGES = new Set(['ar', 'ckb', 'dv', 'fa', 'he', 'ps', 'sd', 'ug', 'ur', 'yi']);

export interface LanguageEntry {
  code: string;
  /** Name in the language itself, e.g. "Français". */
  endonym: string;
  /** Name in the current UI language, e.g. "Französisch". */
  localName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  /** A catalog exists, so the language can be chosen. */
  active: boolean;
}

function displayName(inLocale: string, code: string): string {
  try {
    return new Intl.DisplayNames([inLocale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

const capitalize = (name: string, code: string) => name.charAt(0).toLocaleUpperCase(code) + name.slice(1);

export function languageDir(code: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has(code.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
}

/** Active languages first, then the planned ones without a catalog; each group sorted by name in the UI language. */
export function languageEntries(uiLocale: string, active: readonly string[], planned: readonly string[]): LanguageEntry[] {
  const collator = new Intl.Collator(uiLocale);
  const entry = (code: string, isActive: boolean): LanguageEntry => ({
    code,
    endonym: capitalize(displayName(code, code), code),
    localName: capitalize(displayName(uiLocale, code), uiLocale),
    englishName: displayName('en', code),
    dir: languageDir(code),
    active: isActive,
  });
  const byName = (a: LanguageEntry, b: LanguageEntry) => collator.compare(a.localName, b.localName);
  const activeEntries = active.map((code) => entry(code, true)).sort(byName);
  const soon = planned
    .filter((code, i) => !active.includes(code) && planned.indexOf(code) === i)
    .map((code) => entry(code, false))
    .sort(byName);
  return [...activeEntries, ...soon];
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

/** Matches the code, the endonym, the UI-language name or the English name; ignores case and accents. */
export function matchesLanguage(entry: LanguageEntry, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return [entry.code, entry.endonym, entry.localName, entry.englishName].some((v) => fold(v).includes(q));
}
