import type { Locale, MessageCatalog } from '../types';
import { EN } from './en';

/**
 * One catalog loader per UI language. A language is active exactly when it has a loader here.
 * English ships in the initial bundle as the fallback; every other catalog loads on first use.
 */
export const CATALOGS = {
  en: (): Promise<MessageCatalog> => Promise.resolve(EN),
  de: (): Promise<MessageCatalog> => import('./de').then((m) => m.DE),
};

/** Catalog used for keys a language lacks, and before any other catalog has loaded. */
export const FALLBACK_CATALOG = EN;

export const LOCALES = Object.keys(CATALOGS) as Locale[];
