/** Newsletter document model — JSON is source of truth; HTML is generated. */

import { emptyRichDoc, type RichDoc } from './richtext/model';

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
  | ImageTextBlock;

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

export function createBlock(type: Block['type']): Block {
  const id = newId();
  switch (type) {
    case 'divider':
      return { id, type, style: 'thin', background: 'content' };
    case 'hero':
      return { id, type, label: 'Your intro', headline: 'New headline' };
    case 'paragraph':
      return { id, type, body: emptyRichDoc('New paragraph.') };
    case 'cta-button':
      return { id, type, text: 'Learn more', href: 'https://example.com' };
    case 'chapter-band':
      return { id, type, title: 'Chapter title' };
    case 'pull-quote':
      return { id, type, quote: '\u201cA memorable line.\u201d' };
    case 'stat-box':
      return { id, type, number: '1.000+', label: 'Metric label', geo: 'Region A · Region B' };
    case 'benefits-list':
      return {
        id,
        type,
        items: [
          { icon: BENEFIT_DEFAULT_ICON, text: 'Benefit one' },
          { icon: BENEFIT_DEFAULT_ICON, text: 'Benefit two' },
          { icon: BENEFIT_DEFAULT_ICON, text: 'Benefit three' },
        ],
      };
    case 'price-box':
      return {
        id,
        type,
        badge: 'Offer',
        currency: '€',
        amount: '99',
        periodLabel: '/ year',
        strikeEnabled: true,
        strikeAmount: '199',
        strikeLabel: 'Was',
        details: 'No auto-renew · Cancel anytime',
        fine: 'Limited availability.',
      };
    case 'cta-link-list':
      return {
        id,
        type,
        items: [
          {
            icon: CTA_LINK_DEFAULT_ICON,
            label: 'Book a call:',
            intro: 'We will call you back -',
            linkText: 'Schedule',
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
        body: emptyRichDoc('New text beside the image.'),
        side: 'left',
        imageWidth: 'third',
        valign: 'top',
      };
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
};
