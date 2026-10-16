import { CLOUDLIB_CAMPAIGN_V1 } from './seed-data/cloudlib-campaign.v1';
import { cloudlibCampaignEn } from './seed-data/cloudlib-campaign-en.v1';
import { normalizeNewsletter } from './persist/normalize-newsletter';
import { defaultGlobals } from './brand/defaults';
import { CURRENT_SCHEMA_VERSION, type LegalFooterConfig, type Newsletter } from './types';
import { DEFAULT_DISPLAY_NAME } from './file/sanitize-stem';

export type SeedLanguage = 'de' | 'en';

/** Display names of the two demo copies. */
export const DEMO_DISPLAY_NAMES: Record<SeedLanguage, string> = {
  de: DEFAULT_DISPLAY_NAME,
  en: 'CloudLib-EU-Example-Newsletter-Template-EN',
};

/** Deep-clone the full CloudLib campaign seed (demo config only); the original is never mutated. */
export function seedNewsletter(lang: SeedLanguage = 'de'): Newsletter {
  const raw = (lang === 'en' ? cloudlibCampaignEn() : structuredClone(CLOUDLIB_CAMPAIGN_V1)) as Newsletter;
  return normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: raw.globals,
    blocks: raw.blocks,
  });
}

/** Dummy logo shipped with the app (public/static); a sent email cannot load it, so it must be replaced. */
export const PLACEHOLDER_LOGO_SRC = 'static/placeholder-logo.png';
/** Reserved example domain for placeholder links (never a real company's site). */
export const PLACEHOLDER_HREF = 'https://example.com';

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

/** No blocks and nothing from CloudLib: neutral colors, placeholder brand, logo and footer in that language. */
export function blankNewsletter(lang: SeedLanguage): Newsletter {
  const t = BLANK_TEXTS[lang];
  const g = defaultGlobals();
  return normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: {
      ...g,
      campaignSubject: '',
      preheader: '',
      // Neutral grey-blue palette on a dark page.
      pageBgColor: '#0f1216',
      contentBgColor: '#181c22',
      standardColor: '#9aa4af',
      primaryColor: '#e7ebef',
      secondaryColor: '#9db8d2',
      accentColor: '#d6b46a',
      brand: {
        stars: { symbol: '★', count: 6 },
        name: {
          parts: [
            { text: t.name[0], color: '#e7ebef' },
            { text: t.name[1], color: '#9db8d2' },
          ],
          size: 'm',
          bold: true,
        },
      },
      logo: {
        src: PLACEHOLDER_LOGO_SRC,
        heightPx: 48,
        href: PLACEHOLDER_HREF,
        alt: t.logoAlt,
        lockAspectRatio: true,
        naturalWidth: 287,
        naturalHeight: 310,
      },
      legal: {
        noticeHtml: t.noticeHtml,
        companyName: t.company,
        companyWebsiteLabel: t.website,
        companyWebsiteHref: PLACEHOLDER_HREF,
        privacyLabel: t.privacyLabel,
        privacyHref: `${PLACEHOLDER_HREF}/privacy`,
        imprintLabel: t.imprintLabel,
        imprintHref: `${PLACEHOLDER_HREF}/imprint`,
        unsubscribeLabel: t.unsubscribeLabel,
        viewInBrowserLabel: t.viewInBrowserLabel,
      },
      exportFileNamePrefix: 'Newsletter-Listmonk',
      personalization: { customFields: [], samples: { name: 'Maria Muster', email: 'maria.muster@example.com' } },
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
