import type {
  BrandConfig,
  Globals,
  LegalFooterConfig,
  LogoConfig,
  Newsletter,
  PersonalizationConfig,
} from '../types';
import { CURRENT_SCHEMA_VERSION } from '../types';
import { defaultColors, STANDARD_SETS } from '../colors/model';
import { emptySocialLinks } from './social';

/**
 * Neutral fallback values (English, no real company). Used for a blank newsletter and wherever a
 * stored draft lacks a value. Demo seeds carry their own complete values and never rely on these.
 */

/** Dummy logo shipped with the app (public/static); a sent email cannot load it, so it must be replaced. */
export const PLACEHOLDER_LOGO_SRC = 'static/placeholder-logo.png';
/** Reserved example domain for placeholder links (never a real company's site). */
export const PLACEHOLDER_HREF = 'https://example.com';

/** Color of a brand-name part without a valid color of its own (standard dark: links; headings). */
export const FALLBACK_BRAND_PART_COLOR = STANDARD_SETS.dark.link;
const FALLBACK_BRAND_HEAD_COLOR = STANDARD_SETS.dark.head;

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
        { text: 'YourCompany', color: FALLBACK_BRAND_HEAD_COLOR },
        { text: '.com', color: FALLBACK_BRAND_PART_COLOR },
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
    colors: defaultColors(),
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
