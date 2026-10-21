import type { CATALOGS } from './catalogs';

/** UI languages that have a catalog. */
export type Locale = keyof typeof CATALOGS;

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'newsletter-template-editor.locale.v1';

/** Flat chrome message catalog. Nested content uses dedicated keys. */
export type MessageCatalog = Record<string, string>;
