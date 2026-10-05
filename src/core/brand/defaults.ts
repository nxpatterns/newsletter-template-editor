import type {
  BrandConfig,
  Globals,
  LegalFooterConfig,
  LogoConfig,
  Newsletter,
  PersonalizationConfig,
} from '../types';
import { CURRENT_SCHEMA_VERSION } from '../types';

/** CloudLib.EU demo defaults — same path a fork uses for any brand. */
export function defaultPersonalization(): PersonalizationConfig {
  return {
    customFields: [],
    samples: {
      name: 'Maria Muster',
      email: 'maria.muster@example.eu',
    },
  };
}

export function defaultBrand(): BrandConfig {
  return {
    starsText: '★ ★ ★ ★ ★ ★',
    nameHtml:
      '<span style="font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#4db8ff;letter-spacing:1px">Cloud</span>' +
      '<span style="font-family:Helvetica,Arial,sans-serif;font-size:20px;color:#a8d8f8;font-weight:700;letter-spacing:1px">Lib</span>' +
      '<span style="font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#59abf0;letter-spacing:1px">.EU</span>',
  };
}

export function defaultLogo(): LogoConfig {
  return {
    src: '',
    heightPx: 48,
    href: 'https://cloudlib.eu',
    alt: 'CloudLib.EU',
    lockAspectRatio: true,
  };
}

export function defaultLegal(): LegalFooterConfig {
  return {
    noticeHtml:
      'Sie erhalten diese E‑Mail, weil Sie im Kontext Ihrer 360°‑Präsenz mit uns in Verbindung stehen. Eine Abmeldung ist jederzeit über den Link im Footer möglich.',
    companyLine: 'Wise Solutions GmbH · cloudlib.eu',
    privacyLabel: 'Datenschutz',
    privacyHref: 'https://cloudlib.eu/home/privacy',
    imprintLabel: 'Impressum',
    imprintHref: 'https://cloudlib.eu/home/credits',
    unsubscribeLabel: 'Abmelden',
    viewInBrowserLabel: 'Im Browser ansehen',
  };
}

export function defaultGlobals(): Globals {
  return {
    preheader: '',
    fontFamily: 'Georgia',
    accentColor: '#7ecfff',
    goldColor: '#f5c518',
    bodyTextColor: '#7a9ab8',
    headingColor: '#d8eeff',
    pageBgColor: '#08101e',
    contentBgColor: '#0c1628',
    campaignSubject: '',
    logo: defaultLogo(),
    brand: defaultBrand(),
    legal: defaultLegal(),
    personalization: defaultPersonalization(),
    exportFileNamePrefix: 'CloudLib-Listmonk',
  };
}

export function emptyNewsletter(): Newsletter {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: defaultGlobals(),
    blocks: [],
  };
}
