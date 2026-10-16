import type {
  BrandConfig,
  Globals,
  LegalFooterConfig,
  LogoConfig,
  Newsletter,
  PersonalizationConfig,
} from '../types';
import { CURRENT_SCHEMA_VERSION } from '../types';
import { emptySocialLinks } from './social';

/**
 * Neutral fallback values (English, no real company). Used for a blank newsletter and wherever a
 * stored draft lacks a value. Demo seeds carry their own complete values and never rely on these.
 */

/** Dummy logo shipped with the app (public/static); a sent email cannot load it, so it must be replaced. */
export const PLACEHOLDER_LOGO_SRC = 'static/placeholder-logo.png';
/** Reserved example domain for placeholder links (never a real company's site). */
export const PLACEHOLDER_HREF = 'https://example.com';

/** Neutral grey-blue palette on a dark page. */
export const NEUTRAL_COLORS = {
  pageBgColor: '#0f1216',
  contentBgColor: '#181c22',
  standardColor: '#9aa4af',
  primaryColor: '#e7ebef',
  secondaryColor: '#9db8d2',
  accentColor: '#d6b46a',
} as const;

/** Color of a brand-name part without a valid color of its own. */
export const FALLBACK_BRAND_PART_COLOR = NEUTRAL_COLORS.secondaryColor;

export function defaultPersonalization(): PersonalizationConfig {
  return {
    customFields: [],
    samples: {
      name: 'Maria Muster',
      email: 'maria.muster@example.com',
    },
  };
}

export function defaultBrand(): BrandConfig {
  return {
    stars: { symbol: '★', count: 6 },
    name: {
      parts: [
        { text: 'YourCompany', color: NEUTRAL_COLORS.primaryColor },
        { text: '.com', color: NEUTRAL_COLORS.secondaryColor },
      ],
      size: 'm',
      bold: true,
    },
  };
}

export function defaultLogo(): LogoConfig {
  return {
    src: PLACEHOLDER_LOGO_SRC,
    heightPx: 48,
    href: PLACEHOLDER_HREF,
    alt: 'YourCompany logo',
    lockAspectRatio: true,
    naturalWidth: 287,
    naturalHeight: 310,
  };
}

export function defaultLegal(): LegalFooterConfig {
  return {
    noticeHtml:
      'You are receiving this email because you are in contact with us. You can unsubscribe at any time using the link below.',
    companyName: 'Your Company Name',
    companyWebsiteLabel: 'yourcompany.com',
    companyWebsiteHref: PLACEHOLDER_HREF,
    privacyLabel: 'Privacy',
    privacyHref: `${PLACEHOLDER_HREF}/privacy`,
    imprintLabel: 'Imprint',
    imprintHref: `${PLACEHOLDER_HREF}/imprint`,
    unsubscribeLabel: 'Unsubscribe',
    viewInBrowserLabel: 'View in browser',
    social: emptySocialLinks(),
  };
}

export function defaultGlobals(): Globals {
  return {
    preheader: '',
    fontFamily: 'Georgia',
    ...NEUTRAL_COLORS,
    campaignSubject: '',
    logo: defaultLogo(),
    brand: defaultBrand(),
    legal: defaultLegal(),
    personalization: defaultPersonalization(),
    exportFileNamePrefix: 'Newsletter-Listmonk',
    assetBaseUrl: '',
  };
}

export function emptyNewsletter(): Newsletter {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: defaultGlobals(),
    blocks: [],
  };
}
