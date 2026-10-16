/** Newsletter document model — JSON is source of truth; HTML is generated. */

import { emptyRichDoc, type RichColorToken, type RichDoc, type RichSizeToken } from './richtext/model';

export type {
  RichColorToken,
  RichDoc,
  RichMarks,
  RichParagraphNode,
  RichSizeToken,
} from './richtext/model';

export type FontFamilyPreset =
  | 'Georgia'
  | 'Times-New-Roman'
  | 'Palatino'
  | 'Arial'
  | 'Arial-Narrow'
  | 'Helvetica'
  | 'Verdana'
  | 'Tahoma'
  | 'Trebuchet-MS'
  | 'Lucida-Sans'
  | 'Courier-New'
  | 'Custom';

export interface PersonalizationConfig {
  customFields: string[];
  samples: Record<string, string>;
}

export const BRAND_STAR_SYMBOLS = ['★', '☆', '✦', '◆', '●'] as const;
export const BRAND_STAR_MAX = 9;

/** Decorative row above the brand name and in the footer; count 0 hides both. */
export interface BrandStars {
  symbol: string;
  count: number;
}

export const BRAND_NAME_SIZES = ['s', 'm', 'l'] as const;
export type BrandNameSize = (typeof BRAND_NAME_SIZES)[number];

/** One colored piece of the brand name, e.g. "Cloud" in light blue. */
export interface BrandNamePart {
  text: string;
  color: string;
}

export interface BrandName {
  parts: BrandNamePart[];
  size: BrandNameSize;
  bold: boolean;
}

export interface BrandConfig {
  stars: BrandStars;
  name: BrandName;
}

export interface LogoConfig {
  src: string;
  heightPx: number;
  href?: string;
  alt?: string;
  lockAspectRatio: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  widthPx?: number;
}

/** Legal / company footer — all overridable (no CloudLib lock-in). */
export interface LegalFooterConfig {
  noticeHtml: string;
  /** Company / operator name (plain text). */
  companyName: string;
  /** Website link label in the footer company row. */
  companyWebsiteLabel: string;
  /** Website URL for the company row link. */
  companyWebsiteHref: string;
  privacyLabel: string;
  privacyHref: string;
  imprintLabel: string;
  imprintHref: string;
  unsubscribeLabel: string;
  viewInBrowserLabel: string;
}

export interface Globals {
  preheader: string;
  fontFamily: FontFamilyPreset;
  customFont?: string;
  secondaryColor: string;
  accentColor: string;
  standardColor: string;
  primaryColor: string;
  pageBgColor: string;
  contentBgColor: string;
  campaignSubject?: string;
  logo: LogoConfig;
  brand: BrandConfig;
  legal: LegalFooterConfig;
  personalization: PersonalizationConfig;
  /** Pattern for export filenames; `{name}` placeholder optional later */
  exportFileNamePrefix: string;
}

export interface BlockBase {
  id: string;
  type: string;
}

export const DIVIDER_STYLES = ['thin', 'two-tone', 'ornament', 'glow', 'spacer-only'] as const;
export type DividerStyle = (typeof DIVIDER_STYLES)[number];
export type DividerBackground = 'content' | 'page';

export interface DividerBlock extends BlockBase {
  type: 'divider';
  style: DividerStyle;
  /** Color token only (content or page background), never a hex value. */
  background: DividerBackground;
  heightPx?: number;
}

export interface HeroBlock extends BlockBase {
  type: 'hero';
  label: string;
  /** Plain headline; renderer escapes and owns layout/italic. */
  headline: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  /** Lite rich-text document (paragraph nodes + marks). */
  body: RichDoc;
}

export interface CtaButtonBlock extends BlockBase {
  type: 'cta-button';
  text: string;
  href: string;
}

export interface ChapterBandBlock extends BlockBase {
  type: 'chapter-band';
  /** Plain chapter title; renderer escapes. */
  title: string;
}

export interface PullQuoteBlock extends BlockBase {
  type: 'pull-quote';
  /** Plain quote body; italic via CSS. */
  quote: string;
}

export interface StatBoxBlock extends BlockBase {
  type: 'stat-box';
  number: string;
  label: string;
  /** Plain extras / side text (regions, notes, …); newlines → `<br>` at render. */
  geo: string;
}

export interface BenefitsListItem {
  /** Single email-safe glyph before the benefit text (same picker as CTA links). */
  icon: string;
  text: string;
}

/** Default chevron used in the CloudLib benefits render. */
export const BENEFIT_DEFAULT_ICON = '›';

export function emptyBenefitsListItem(): BenefitsListItem {
  return { icon: BENEFIT_DEFAULT_ICON, text: '' };
}

export interface BenefitsListBlock extends BlockBase {
  type: 'benefits-list';
  items: BenefitsListItem[];
}

export interface PriceBoxBlock extends BlockBase {
  type: 'price-box';
  badge: string;
  /** Currency symbol or short code (€, $, CHF, …). */
  currency: string;
  /** Main price number/text (e.g. 99). */
  amount: string;
  /** Unit / period after the amount (e.g. netto / Jahr). */
  periodLabel: string;
  /** When false, the strike line is omitted from the render. */
  strikeEnabled: boolean;
  /** Optional was-price amount. */
  strikeAmount: string;
  /** Optional was-price prefix (e.g. Statt, Was). */
  strikeLabel: string;
  details: string;
  fine: string;
}

export interface CtaLinkListItem {
  /** Single email-safe glyph before the title (inspector picker). */
  icon: string;
  label: string;
  intro: string;
  linkText: string;
  href: string;
}

/** Default bullet glyph for new / legacy CTA link rows. */
export const CTA_LINK_DEFAULT_ICON = '→';

/**
 * Curated email-safe single-character icons for list rows (CTA links, benefits).
 * Prefer plain symbols that survive common clients (no emoji skin tones).
 */
export const CTA_LINK_ICONS: readonly string[] = [
  '→',
  '←',
  '↑',
  '↓',
  '⇒',
  '•',
  '●',
  '○',
  '■',
  '□',
  '◆',
  '◇',
  '★',
  '☆',
  '✓',
  '✔',
  '✗',
  '+',
  '–',
  '=',
  '*',
  '›',
  '»',
  '·',
  '|',
  '#',
  '@',
  '~',
  '>',
  '/',
] as const;

export function emptyCtaLinkListItem(): CtaLinkListItem {
  return {
    icon: CTA_LINK_DEFAULT_ICON,
    label: '',
    intro: '',
    linkText: '',
    href: '',
  };
}

export interface CtaLinkListBlock extends BlockBase {
  type: 'cta-link-list';
  items: CtaLinkListItem[];
}

export const IMAGE_WIDTHS = ['full', 'text', 'small'] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export interface ImageBlock extends BlockBase {
  type: 'image';
  /** https URL (works everywhere) or a data: URL (embedded; not shown by Gmail / classic Outlook). */
  src: string;
  /** Required in the editor: shown when images are blocked and read by screen readers. */
  alt: string;
  href: string;
  caption: string;
  width: ImageWidth;
}

export const IMAGE_TEXT_SIDES = ['left', 'right'] as const;
export type ImageTextSide = (typeof IMAGE_TEXT_SIDES)[number];
export const IMAGE_TEXT_WIDTHS = ['third', 'half'] as const;
export type ImageTextWidth = (typeof IMAGE_TEXT_WIDTHS)[number];
export const IMAGE_TEXT_VALIGNS = ['top', 'middle'] as const;
export type ImageTextValign = (typeof IMAGE_TEXT_VALIGNS)[number];

/** Image beside a paragraph; stacks with the image first on phones. */
export interface ImageTextBlock extends BlockBase {
  type: 'image-text';
  src: string;
  alt: string;
  href: string;
  /** Lite rich-text document, same model and editor as the paragraph block. */
  body: RichDoc;
  side: ImageTextSide;
  imageWidth: ImageTextWidth;
  /** Vertical position of the text next to the image. */
  valign: ImageTextValign;
}

/**
 * Opening line. Default is a fixed line with no name ("Werte Geschäftspartner").
 * With `useName`, the line becomes "{nameLead} {full name}" (no punctuation added) and the fixed line is the
 * fallback for recipients without a real name. Never gendered (no salutation field).
 */
export interface GreetingBlock extends BlockBase {
  type: 'greeting';
  /** Fixed line; also the fallback when the name is unknown. */
  text: string;
  useName: boolean;
  /** Words before the name, e.g. "Guten Tag". */
  nameLead: string;
  size: RichSizeToken;
  color: RichColorToken;
}

/** Block union — expand slice by slice */
export type Block =
  | DividerBlock
  | HeroBlock
  | ParagraphBlock
  | CtaButtonBlock
  | ChapterBandBlock
  | PullQuoteBlock
  | StatBoxBlock
  | BenefitsListBlock
  | PriceBoxBlock
  | CtaLinkListBlock
  | ImageBlock
  | ImageTextBlock
  | GreetingBlock;

export interface Newsletter {
  schemaVersion: number;
  globals: Globals;
  blocks: Block[];
}

/**
 * v2: color tokens standard/primary/secondary/accent/dim, sizes xs–xl (persist/migrate-v2.ts).
 * v3: divider style secondary-double → two-tone, divider background token (persist/migrate-v3.ts).
 * v4: brand starsText/nameHtml → structured stars and name parts (persist/migrate-v4.ts).
 */
export const CURRENT_SCHEMA_VERSION = 4;

let idCounter = 0;

export function newId(): string {
  idCounter += 1;
  return `b${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** Starting texts for new blocks; the app fills these from the active language. */
export interface BlockDefaultTexts {
  heroLabel: string;
  heroHeadline: string;
  paragraph: string;
  ctaButton: string;
  chapterTitle: string;
  pullQuote: string;
  statNumber: string;
  statLabel: string;
  statGeo: string;
  benefits: readonly [string, string, string];
  priceBadge: string;
  pricePeriod: string;
  priceStrikeLabel: string;
  priceDetails: string;
  priceFine: string;
  ctaLinkLabel: string;
  ctaLinkIntro: string;
  ctaLinkText: string;
  imageText: string;
  greetingText: string;
  greetingNameLead: string;
}

export const BLOCK_DEFAULT_TEXTS_EN: BlockDefaultTexts = {
  heroLabel: 'Your intro',
  heroHeadline: 'New headline',
  paragraph: 'New paragraph.',
  ctaButton: 'Learn more',
  chapterTitle: 'Chapter title',
  pullQuote: '\u201cA memorable line.\u201d',
  statNumber: '1,000+',
  statLabel: 'Metric label',
  statGeo: 'Region A · Region B',
  benefits: ['Benefit one', 'Benefit two', 'Benefit three'],
  priceBadge: 'Offer',
  pricePeriod: '/ year',
  priceStrikeLabel: 'Was',
  priceDetails: 'No auto-renew · Cancel anytime',
  priceFine: 'Limited availability.',
  ctaLinkLabel: 'Book a call:',
  ctaLinkIntro: 'We will call you back -',
  ctaLinkText: 'Schedule',
  imageText: 'New text beside the image.',
  greetingText: 'Dear business partner',
  greetingNameLead: 'Hello',
};

export function createBlock(type: Block['type'], texts: BlockDefaultTexts = BLOCK_DEFAULT_TEXTS_EN): Block {
  const id = newId();
  const t = texts;
  switch (type) {
    case 'divider':
      return { id, type, style: 'thin', background: 'content' };
    case 'hero':
      return { id, type, label: t.heroLabel, headline: t.heroHeadline };
    case 'paragraph':
      return { id, type, body: emptyRichDoc(t.paragraph) };
    case 'cta-button':
      return { id, type, text: t.ctaButton, href: 'https://example.com' };
    case 'chapter-band':
      return { id, type, title: t.chapterTitle };
    case 'pull-quote':
      return { id, type, quote: t.pullQuote };
    case 'stat-box':
      return { id, type, number: t.statNumber, label: t.statLabel, geo: t.statGeo };
    case 'benefits-list':
      return {
        id,
        type,
        items: t.benefits.map((text) => ({ icon: BENEFIT_DEFAULT_ICON, text })),
      };
    case 'price-box':
      return {
        id,
        type,
        badge: t.priceBadge,
        currency: '€',
        amount: '99',
        periodLabel: t.pricePeriod,
        strikeEnabled: true,
        strikeAmount: '199',
        strikeLabel: t.priceStrikeLabel,
        details: t.priceDetails,
        fine: t.priceFine,
      };
    case 'cta-link-list':
      return {
        id,
        type,
        items: [
          {
            icon: CTA_LINK_DEFAULT_ICON,
            label: t.ctaLinkLabel,
            intro: t.ctaLinkIntro,
            linkText: t.ctaLinkText,
            href: 'https://example.com/contact',
          },
        ],
      };
    case 'image':
      return { id, type, src: '', alt: '', href: '', caption: '', width: 'text' };
    case 'image-text':
      return {
        id,
        type,
        src: '',
        alt: '',
        href: '',
        body: emptyRichDoc(t.imageText),
        side: 'left',
        imageWidth: 'third',
        valign: 'top',
      };
    case 'greeting':
      return { id, type, text: t.greetingText, useName: false, nameLead: t.greetingNameLead, size: 'm', color: 'standard' };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown block type: ${_exhaustive}`);
    }
  }
}

export const BLOCK_LABELS: Record<Block['type'], string> = {
  divider: 'Divider',
  hero: 'Hero',
  paragraph: 'Paragraph',
  'cta-button': 'CTA Button',
  'chapter-band': 'Chapter band',
  'pull-quote': 'Pull quote',
  'stat-box': 'Stat box',
  'benefits-list': 'Benefits list',
  'price-box': 'Price box',
  'cta-link-list': 'CTA link list',
  image: 'Image',
  'image-text': 'Image and text',
  greeting: 'Greeting',
};
