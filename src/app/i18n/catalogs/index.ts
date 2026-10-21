import type { Locale } from '../types';
import { DE } from './de';
import { EN } from './en';

/** One catalog per UI language. A language is active exactly when it has a catalog here. */
export const CATALOGS = { en: EN, de: DE };

export const LOCALES = Object.keys(CATALOGS) as Locale[];
