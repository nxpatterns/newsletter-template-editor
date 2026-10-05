export type Locale = 'en' | 'de';

export const LOCALES: readonly Locale[] = ['en', 'de'] as const;

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'newsletter-template-editor.locale.v1';

/** Flat chrome message catalog. Nested content uses dedicated keys. */
export type MessageCatalog = Record<string, string>;
