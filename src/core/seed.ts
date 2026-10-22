import { CLOUDLIB_CAMPAIGN_V1 } from './seed-data/cloudlib-campaign.v1';
import { cloudlibCampaignEn } from './seed-data/cloudlib-campaign-en.v1';
import { normalizeNewsletter } from './persist/normalize-newsletter';
import { defaultGlobals, PLACEHOLDER_HREF, PLACEHOLDER_LOGO_SRC } from './brand/defaults';
import { CURRENT_SCHEMA_VERSION, type LegalFooterConfig, type Newsletter } from './types';

export type SeedLanguage = 'de' | 'en';

/** Display names of the two demo copies. */
export const DEMO_DISPLAY_NAMES: Record<SeedLanguage, string> = {
  de: 'CloudLib-EU-Example-Newsletter-Template',
  en: 'CloudLib-EU-Example-Newsletter-Template-EN',
};

/** Deep-clone the full CloudLib campaign seed (demo config only); the original is never mutated. */
export function seedNewsletter(lang: SeedLanguage = 'de'): Newsletter {
  const raw = (lang === 'en' ? cloudlibCampaignEn() : structuredClone(CLOUDLIB_CAMPAIGN_V1)) as Newsletter;
  return normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: { ...raw.globals, language: lang },
    blocks: raw.blocks,
  });
}

export { PLACEHOLDER_HREF, PLACEHOLDER_LOGO_SRC };

const BLANK_TEXTS: Record<
  SeedLanguage,
  { name: [string, string]; logoAlt: string; company: string; website: string } & Pick<
    LegalFooterConfig,
    'noticeHtml' | 'privacyLabel' | 'imprintLabel' | 'unsubscribeLabel' | 'viewInBrowserLabel'
  >
> = {
  en: {
    name: ['YourCompany', '.com'],
    logoAlt: 'YourCompany logo',
    company: 'Your Company Name',
    website: 'yourcompany.com',
    noticeHtml:
      'You are receiving this email because you are in contact with us. You can unsubscribe at any time using the link below.',
    privacyLabel: 'Privacy',
    imprintLabel: 'Imprint',
    unsubscribeLabel: 'Unsubscribe',
    viewInBrowserLabel: 'View in browser',
  },
  de: {
    name: ['IhreFirma', '.de'],
    logoAlt: 'Logo IhreFirma',
    company: 'Ihr Firmenname',
    website: 'ihrefirma.de',
    noticeHtml:
      'Sie erhalten diese E-Mail, weil Sie mit uns in Kontakt stehen. Eine Abmeldung ist jederzeit über den Link unten möglich.',
    privacyLabel: 'Datenschutz',
    imprintLabel: 'Impressum',
    unsubscribeLabel: 'Abmelden',
    viewInBrowserLabel: 'Im Browser ansehen',
  },
};

/** No blocks and nothing from CloudLib: the neutral defaults, with brand, logo text and footer in that language. */
export function blankNewsletter(lang: SeedLanguage): Newsletter {
  const t = BLANK_TEXTS[lang];
  const g = defaultGlobals();
  return normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: {
      ...g,
      language: lang,
      brand: {
        ...g.brand,
        name: { ...g.brand.name, parts: g.brand.name.parts.map((p, i) => ({ ...p, text: t.name[i] })) },
      },
      logo: { ...g.logo, alt: t.logoAlt },
      legal: {
        ...g.legal,
        noticeHtml: t.noticeHtml,
        companyName: t.company,
        companyWebsiteLabel: t.website,
        privacyLabel: t.privacyLabel,
        imprintLabel: t.imprintLabel,
        unsubscribeLabel: t.unsubscribeLabel,
        viewInBrowserLabel: t.viewInBrowserLabel,
      },
    },
    blocks: [],
  });
}

/** What still needs replacing before sending: the dummy logo and example.com links. */
export function placeholderParts(n: Newsletter): ('logo' | 'links')[] {
  const g = n.globals;
  const out: ('logo' | 'links')[] = [];
  if (g.logo?.src === PLACEHOLDER_LOGO_SRC) out.push('logo');
  const hrefs = [g.logo?.href, g.legal.companyWebsiteHref, g.legal.privacyHref, g.legal.imprintHref];
  if (hrefs.some((h) => (h ?? '').startsWith(PLACEHOLDER_HREF))) out.push('links');
  return out;
}
