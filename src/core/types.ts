/** Newsletter document model — JSON is source of truth; HTML is generated. */

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

export interface BrandConfig {
  /** e.g. star row; empty hides it */
  starsText: string;
  /** HTML for brand name in header (may include styled spans) */
  nameHtml: string;
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
  companyLine: string;
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
  accentColor: string;
  goldColor: string;
  bodyTextColor: string;
  headingColor: string;
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

export interface DividerBlock extends BlockBase {
  type: 'divider';
  style: 'thin' | 'accent-double' | 'spacer-only';
  heightPx?: number;
}

export interface HeroBlock extends BlockBase {
  type: 'hero';
  label: string;
  headlineHtml: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  html: string;
}

export interface CtaButtonBlock extends BlockBase {
  type: 'cta-button';
  text: string;
  href: string;
}

/** v0 block union — expand slice by slice */
export type Block = DividerBlock | HeroBlock | ParagraphBlock | CtaButtonBlock;

export interface Newsletter {
  schemaVersion: number;
  globals: Globals;
  blocks: Block[];
}

export const CURRENT_SCHEMA_VERSION = 1;

let idCounter = 0;

export function newId(): string {
  idCounter += 1;
  return `b${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createBlock(type: Block['type']): Block {
  const id = newId();
  switch (type) {
    case 'divider':
      return { id, type, style: 'thin' };
    case 'hero':
      return { id, type, label: 'Your intro', headlineHtml: '<em>New headline</em>' };
    case 'paragraph':
      return { id, type, html: 'New paragraph.' };
    case 'cta-button':
      return { id, type, text: 'Learn more', href: 'https://example.com' };
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
};
