import {
  BENEFIT_DEFAULT_ICON,
  BRAND_NAME_SIZES,
  BRAND_STAR_MAX,
  CTA_LINK_DEFAULT_ICON,
  CURRENT_SCHEMA_VERSION,
  DIVIDER_STYLES,
  IMAGE_TEXT_SIDES,
  IMAGE_TEXT_VALIGNS,
  IMAGE_TEXT_WIDTHS,
  IMAGE_WIDTHS,
  emptyBenefitsListItem,
  emptyCtaLinkListItem,
  type BenefitsListBlock,
  type BrandConfig,
  type BenefitsListItem,
  type Block,
  type ChapterBandBlock,
  type CtaLinkListBlock,
  type CtaLinkListItem,
  type DividerBlock,
  type DividerStyle,
  type HeroBlock,
  type ImageBlock,
  type ImageTextBlock,
  type GreetingBlock,
  type ContactBlock,
  type VideoBlock,
  type TeasersBlock,
  type TeaserItem,
  type EventBlock,
  type EventLocationMode,
  type EventLocale,
  emptyTeaserItem,
  EVENT_LOCATION_MODES,
  EVENT_LOCALES,
  type QuoteImageMode,
  QUOTE_IMAGE_MODES,
  BLOCK_DEFAULT_TEXTS_EN,
  type ImageWidth,
  type Newsletter,
  type ParagraphBlock,
  type PriceBoxBlock,
  type PullQuoteBlock,
  type StatBoxBlock,
} from '../types';
import { ensureRichDoc } from '../richtext/from-html';
import { emptyRichDoc, isRichColorToken, RICH_SIZE_TOKENS, type RichSizeToken } from '../richtext/model';
import { migrateNewsletterV1ToV2 } from './migrate-v2';
import { migrateNewsletterV2ToV3 } from './migrate-v3';
import { migrateNewsletterV3ToV4 } from './migrate-v4';
import { defaultBrand, FALLBACK_BRAND_PART_COLOR } from '../brand/defaults';
import { normalizeSocialLinks } from '../brand/social';

/** Strip tags / collapse whitespace for legacy HTML price blobs. */
export function plainFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip tags but keep line breaks from `<br>` / paragraph ends (geo, quotes). */
export function plainMultilineFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickPlainField(
  plain: unknown,
  legacyHtml: unknown,
  multiline = false,
): string {
  const fromHtml = multiline ? plainMultilineFromHtml : plainFromHtml;
  if (typeof plain === 'string' && legacyHtml === undefined) {
    return plain;
  }
  if (typeof legacyHtml === 'string') {
    return fromHtml(legacyHtml);
  }
  if (typeof plain === 'string') {
    return fromHtml(plain);
  }
  return '';
}

/** Currency symbols/codes recognized during legacy price migration. */
const CURRENCY_TAIL_RE = /^(.*?)\s*(€|\$|£|₺|CHF|USD|EUR)\s*$/i;
const AMOUNT_RE = /(\d+(?:[.,]\d+)?)/;
const CURRENCY_HEAD_RE = /^(€|\$|£|₺|CHF|USD|EUR)\s*(.*)$/i;

/**
 * Split a free-form price line into optional prefix (e.g. "Statt"), currency,
 * amount, and period label. Used only for one-shot legacy migration.
 */
export function splitPriceLine(raw: string): {
  prefix: string;
  currency: string;
  amount: string;
  periodLabel: string;
} {
  const text = plainFromHtml(raw);
  if (!text) {
    return { prefix: '', currency: '€', amount: '', periodLabel: '' };
  }

  const amountMatch = text.match(AMOUNT_RE);
  if (!amountMatch || amountMatch.index === undefined) {
    return { prefix: '', currency: '€', amount: text, periodLabel: '' };
  }

  const amount = amountMatch[1];
  const before = text.slice(0, amountMatch.index).trim();
  let periodLabel = text.slice(amountMatch.index + amount.length).trim();

  let currency = '';
  let prefix = before;

  const beforeCur = before.match(CURRENCY_TAIL_RE);
  if (beforeCur) {
    prefix = (beforeCur[1] || '').trim();
    currency = beforeCur[2] || '';
  }

  if (!currency) {
    const afterCur = periodLabel.match(CURRENCY_HEAD_RE);
    if (afterCur) {
      currency = afterCur[1];
      periodLabel = (afterCur[2] || '').trim();
    }
  }

  return {
    prefix,
    currency: currency || '€',
    amount,
    periodLabel,
  };
}

type LegacyPriceRaw = Record<string, unknown> & {
  id?: unknown;
  badge?: unknown;
  details?: unknown;
  fine?: unknown;
  currency?: unknown;
  amount?: unknown;
  periodLabel?: unknown;
  strikeEnabled?: unknown;
  strikeAmount?: unknown;
  strikeLabel?: unknown;
  mainPriceHtml?: unknown;
  strike?: unknown;
};

/** Map legacy or partial price-box payloads onto the structured shape. */
export function normalizePriceBoxBlock(raw: LegacyPriceRaw, fallbackId = ''): PriceBoxBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const badge = typeof raw.badge === 'string' ? raw.badge : '';
  const details = typeof raw.details === 'string' ? raw.details : '';
  const fine = typeof raw.fine === 'string' ? raw.fine : '';

  const hasStructured =
    typeof raw.currency === 'string' &&
    typeof raw.amount === 'string' &&
    raw.mainPriceHtml === undefined;

  if (hasStructured) {
    const strikeAmount = typeof raw.strikeAmount === 'string' ? raw.strikeAmount : '';
    const strikeLabel = typeof raw.strikeLabel === 'string' ? raw.strikeLabel : '';
    const strikeEnabled =
      typeof raw.strikeEnabled === 'boolean'
        ? raw.strikeEnabled
        : Boolean(strikeAmount || strikeLabel);
    return {
      id,
      type: 'price-box',
      badge,
      currency: raw.currency as string,
      amount: raw.amount as string,
      periodLabel: typeof raw.periodLabel === 'string' ? raw.periodLabel : '',
      strikeEnabled,
      strikeAmount,
      strikeLabel,
      details,
      fine,
    };
  }

  const main = splitPriceLine(typeof raw.mainPriceHtml === 'string' ? raw.mainPriceHtml : '');
  const strikeRaw = typeof raw.strike === 'string' ? raw.strike : '';
  const strike = splitPriceLine(strikeRaw);

  const currency =
    typeof raw.currency === 'string' && raw.currency
      ? raw.currency
      : main.currency || strike.currency || '€';
  const amount =
    typeof raw.amount === 'string' && raw.amount ? raw.amount : main.amount || '0';
  const periodLabel =
    typeof raw.periodLabel === 'string' && raw.periodLabel
      ? raw.periodLabel
      : main.periodLabel || strike.periodLabel || '';

  const strikeAmount =
    typeof raw.strikeAmount === 'string'
      ? raw.strikeAmount
      : strike.amount;
  const strikeLabel =
    typeof raw.strikeLabel === 'string'
      ? raw.strikeLabel
      : strike.prefix || (strikeRaw.trim() ? 'Was' : '');
  const strikeEnabled =
    typeof raw.strikeEnabled === 'boolean'
      ? raw.strikeEnabled
      : Boolean(strikeRaw.trim() || strikeAmount || strikeLabel);

  return {
    id,
    type: 'price-box',
    badge,
    currency,
    amount,
    periodLabel,
    strikeEnabled,
    strikeAmount,
    strikeLabel,
    details,
    fine,
  };
}

/** Map legacy html string onto rich `body` document. */
export function normalizeParagraphBlock(
  raw: Record<string, unknown> & { id?: unknown; body?: unknown; html?: unknown },
  fallbackId = '',
): ParagraphBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  if (Array.isArray(raw.body)) {
    return { id, type: 'paragraph', body: ensureRichDoc(raw.body) };
  }
  if (typeof raw.html === 'string') {
    return { id, type: 'paragraph', body: ensureRichDoc(raw.html) };
  }
  if (typeof raw.body === 'string') {
    return { id, type: 'paragraph', body: ensureRichDoc(raw.body) };
  }
  return { id, type: 'paragraph', body: emptyRichDoc() };
}

/** Map legacy headlineHtml onto plain headline storage. */
export function normalizeHeroBlock(
  raw: Record<string, unknown> & { id?: unknown; label?: unknown; headline?: unknown; headlineHtml?: unknown },
  fallbackId = '',
): HeroBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const label = typeof raw.label === 'string' ? raw.label : '';
  const headline = pickPlainField(raw.headline, raw.headlineHtml);
  return { id, type: 'hero', label, headline };
}

/** Map legacy titleHtml onto plain title. */
export function normalizeChapterBandBlock(
  raw: Record<string, unknown> & { id?: unknown; title?: unknown; titleHtml?: unknown },
  fallbackId = '',
): ChapterBandBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  return {
    id,
    type: 'chapter-band',
    title: pickPlainField(raw.title, raw.titleHtml),
  };
}

/** Map legacy html onto plain quote. */
export function normalizePullQuoteBlock(
  raw: Record<string, unknown> & { id?: unknown; quote?: unknown; html?: unknown },
  fallbackId = '',
): PullQuoteBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  return {
    id,
    type: 'pull-quote',
    quote: pickPlainField(raw.quote, raw.html, true),
    // Quotes saved before the byline existed: all empty → classic look.
    name: str('name'),
    role: str('role'),
    imageMode: (QUOTE_IMAGE_MODES as readonly unknown[]).includes(raw['imageMode']) ? (raw['imageMode'] as QuoteImageMode) : 'none',
    src: str('src'),
    alt: str('alt'),
  };
}

/** Map legacy geoHtml onto plain geo (keeps breaks). */
export function normalizeStatBoxBlock(
  raw: Record<string, unknown> & {
    id?: unknown;
    number?: unknown;
    label?: unknown;
    geo?: unknown;
    geoHtml?: unknown;
  },
  fallbackId = '',
): StatBoxBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  return {
    id,
    type: 'stat-box',
    number: typeof raw.number === 'string' ? raw.number : '',
    label: typeof raw.label === 'string' ? raw.label : '',
    geo: pickPlainField(raw.geo, raw.geoHtml, true),
  };
}

/** Migrate legacy string[] benefits and ensure icon + text rows (min one). */
export function normalizeBenefitsListBlock(
  raw: Record<string, unknown> & { id?: unknown; items?: unknown },
  fallbackId = '',
): BenefitsListBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const source = Array.isArray(raw.items) ? raw.items : [];
  const items: BenefitsListItem[] = source.map((entry) => {
    if (typeof entry === 'string') {
      return { icon: BENEFIT_DEFAULT_ICON, text: entry };
    }
    if (!entry || typeof entry !== 'object') return emptyBenefitsListItem();
    const row = entry as Record<string, unknown>;
    const iconRaw = typeof row['icon'] === 'string' ? (row['icon'] as string).trim() : '';
    const text =
      typeof row['text'] === 'string'
        ? (row['text'] as string)
        : typeof row['label'] === 'string'
          ? (row['label'] as string)
          : '';
    return {
      icon: iconRaw || BENEFIT_DEFAULT_ICON,
      text,
    };
  });
  return {
    id,
    type: 'benefits-list',
    items: items.length > 0 ? items : [emptyBenefitsListItem()],
  };
}

/** Ensure CTA link rows have icon + plain fields; keep at least one row. */
export function normalizeCtaLinkListBlock(
  raw: Record<string, unknown> & { id?: unknown; items?: unknown },
  fallbackId = '',
): CtaLinkListBlock {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const source = Array.isArray(raw.items) ? raw.items : [];
  const items: CtaLinkListItem[] = source.map((entry) => {
    if (!entry || typeof entry !== 'object') return emptyCtaLinkListItem();
    const row = entry as Record<string, unknown>;
    const iconRaw = typeof row['icon'] === 'string' ? (row['icon'] as string).trim() : '';
    return {
      icon: iconRaw || CTA_LINK_DEFAULT_ICON,
      label: typeof row['label'] === 'string' ? (row['label'] as string) : '',
      intro: typeof row['intro'] === 'string' ? (row['intro'] as string) : '',
      linkText: typeof row['linkText'] === 'string' ? (row['linkText'] as string) : '',
      href: typeof row['href'] === 'string' ? (row['href'] as string) : '',
    };
  });
  return {
    id,
    type: 'cta-link-list',
    items: items.length > 0 ? items : [emptyCtaLinkListItem()],
  };
}

function normalizeDividerBlock(raw: Record<string, unknown>, id: string): DividerBlock {
  const style = (DIVIDER_STYLES as readonly unknown[]).includes(raw['style'])
    ? (raw['style'] as DividerStyle)
    : 'thin';
  const next: DividerBlock = {
    id,
    type: 'divider',
    style,
    background: raw['background'] === 'page' ? 'page' : 'content',
  };
  if (typeof raw['heightPx'] === 'number') next.heightPx = raw['heightPx'];
  return next;
}

function normalizeImageBlock(raw: Record<string, unknown>, id: string): ImageBlock {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  return {
    id,
    type: 'image',
    src: str('src'),
    alt: str('alt'),
    href: str('href'),
    caption: str('caption'),
    width: (IMAGE_WIDTHS as readonly unknown[]).includes(raw['width']) ? (raw['width'] as ImageWidth) : 'text',
  };
}

function normalizeImageTextBlock(raw: Record<string, unknown>, id: string): ImageTextBlock {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  const pick = <T extends string>(k: string, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly unknown[]).includes(raw[k]) ? (raw[k] as T) : fallback;
  return {
    id,
    type: 'image-text',
    src: str('src'),
    alt: str('alt'),
    href: str('href'),
    body: Array.isArray(raw['body']) || typeof raw['body'] === 'string' ? ensureRichDoc(raw['body']) : emptyRichDoc(),
    side: pick('side', IMAGE_TEXT_SIDES, 'left'),
    imageWidth: pick('imageWidth', IMAGE_TEXT_WIDTHS, 'third'),
    valign: pick('valign', IMAGE_TEXT_VALIGNS, 'top'),
  };
}

function normalizeGreetingBlock(raw: Record<string, unknown>, id: string): GreetingBlock {
  const str = (k: string, fallback: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : fallback);
  return {
    id,
    type: 'greeting',
    text: str('text', BLOCK_DEFAULT_TEXTS_EN.greetingText),
    useName: raw['useName'] === true,
    nameLead: str('nameLead', BLOCK_DEFAULT_TEXTS_EN.greetingNameLead),
    size: (RICH_SIZE_TOKENS as readonly unknown[]).includes(raw['size']) ? (raw['size'] as RichSizeToken) : 'm',
    color: isRichColorToken(raw['color']) ? raw['color'] : 'standard',
  };
}

function normalizeContactBlock(raw: Record<string, unknown>, id: string): ContactBlock {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  return {
    id,
    type: 'contact',
    src: str('src'),
    alt: str('alt'),
    intro: str('intro'),
    name: str('name'),
    role: str('role'),
    phone: str('phone'),
    email: str('email'),
    buttonLabel: str('buttonLabel'),
    href: str('href'),
  };
}

function normalizeVideoBlock(raw: Record<string, unknown>, id: string): VideoBlock {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  return {
    id,
    type: 'video',
    src: str('src'),
    alt: str('alt'),
    href: str('href'),
    title: str('title'),
    duration: str('duration'),
  };
}

function normalizeTeasersBlock(raw: Record<string, unknown>, id: string): TeasersBlock {
  const source = Array.isArray(raw['items']) ? raw['items'] : [];
  const items: TeaserItem[] = source.map((entry) => {
    const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const str = (k: string) => (typeof row[k] === 'string' ? (row[k] as string) : '');
    return { src: str('src'), alt: str('alt'), title: str('title'), text: str('text'), linkText: str('linkText'), href: str('href') };
  });
  return {
    id,
    type: 'teasers',
    columns: raw['columns'] === 3 ? 3 : 2,
    items: items.length > 0 ? items : [emptyTeaserItem()],
  };
}

function normalizeEventBlock(raw: Record<string, unknown>, id: string): EventBlock {
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  const mode = raw['locationMode'];
  const locale = raw['locale'];
  return {
    id,
    type: 'event',
    title: str('title'),
    date: str('date'),
    start: str('start'),
    end: str('end'),
    timezone: str('timezone') || 'Europe/Berlin',
    locationMode: (EVENT_LOCATION_MODES as readonly unknown[]).includes(mode) ? (mode as EventLocationMode) : 'online',
    location: str('location'),
    buttonLabel: str('buttonLabel'),
    href: str('href'),
    calendar: typeof raw['calendar'] === 'boolean' ? (raw['calendar'] as boolean) : true,
    calendarLabel: str('calendarLabel'),
    locale: (EVENT_LOCALES as readonly unknown[]).includes(locale) ? (locale as EventLocale) : 'en',
  };
}

function normalizeBlocks(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (block.type === 'contact') {
      return normalizeContactBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'teasers') {
      return normalizeTeasersBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'event') {
      return normalizeEventBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'video') {
      return normalizeVideoBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'greeting') {
      return normalizeGreetingBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'image-text') {
      return normalizeImageTextBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'image') {
      return normalizeImageBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'divider') {
      return normalizeDividerBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'paragraph') {
      return normalizeParagraphBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'hero') {
      return normalizeHeroBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'chapter-band') {
      return normalizeChapterBandBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'pull-quote') {
      return normalizePullQuoteBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'stat-box') {
      return normalizeStatBoxBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'price-box') {
      return normalizePriceBoxBlock(block as unknown as LegacyPriceRaw, block.id);
    }
    if (block.type === 'cta-link-list') {
      return normalizeCtaLinkListBlock(block as unknown as Record<string, unknown>, block.id);
    }
    if (block.type === 'benefits-list') {
      return normalizeBenefitsListBlock(block as unknown as Record<string, unknown>, block.id);
    }
    return block;
  });
}

/** Back-compat normalizer for drafts loaded from storage / project files. */
export function normalizeNewsletter(input: Newsletter): Newsletter {
  // Missing version = pre-versioning draft → treat as v1.
  const fromVersion = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  const v2 = fromVersion < 2 ? migrateNewsletterV1ToV2(input) : input;
  const v3 = fromVersion < 3 ? migrateNewsletterV2ToV3(v2) : v2;
  const n = fromVersion < 4 ? migrateNewsletterV3ToV4(v3) : v3;
  const legal = n.globals?.legal as Newsletter['globals']['legal'] & {
    companyLine?: string;
  };

  if (legal) {
    if (!legal.companyName && typeof legal.companyLine === 'string') {
      const raw = legal.companyLine.trim();
      const parts = raw
        .split('·')
        .map((p) => p.trim())
        .filter(Boolean);
      legal.companyName = parts[0] || raw;
      if (!legal.companyWebsiteLabel && parts[1]) legal.companyWebsiteLabel = parts[1];
      if (!legal.companyWebsiteHref && parts[1]) {
        legal.companyWebsiteHref = parts[1].includes('://') ? parts[1] : `https://${parts[1]}`;
      }
    }
    legal.companyName = legal.companyName ?? '';
    legal.companyWebsiteLabel = legal.companyWebsiteLabel ?? '';
    legal.companyWebsiteHref = legal.companyWebsiteHref ?? '';
    legal.social = normalizeSocialLinks(legal.social);
  }

  return {
    ...n,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: n.globals
      ? {
          ...n.globals,
          brand: normalizeBrand(n.globals.brand),
          assetBaseUrl: typeof n.globals.assetBaseUrl === 'string' ? n.globals.assetBaseUrl : '',
        }
      : n.globals,
    blocks: Array.isArray(n.blocks) ? normalizeBlocks(n.blocks) : [],
  };
}

const HEX = /^#[0-9a-f]{3,8}$/i;

/** Valid v4 brand for any input: unknown symbols stay (a custom one from a migration), bad values fall back. */
export function normalizeBrand(raw: unknown): BrandConfig {
  const fallback = defaultBrand();
  const b = (raw && typeof raw === 'object' ? raw : {}) as Partial<BrandConfig>;
  const stars = b.stars && typeof b.stars === 'object' ? b.stars : fallback.stars;
  const count = Number.isFinite(stars.count) ? Math.round(stars.count) : fallback.stars.count;
  const name = b.name && typeof b.name === 'object' ? b.name : fallback.name;
  const parts = Array.isArray(name.parts)
    ? name.parts
        .filter((p) => p && typeof p.text === 'string')
        .map((p) => ({ text: p.text, color: typeof p.color === 'string' && HEX.test(p.color) ? p.color : FALLBACK_BRAND_PART_COLOR }))
    : fallback.name.parts;
  return {
    stars: {
      symbol: typeof stars.symbol === 'string' && stars.symbol.trim() ? stars.symbol : '★',
      count: Math.max(0, Math.min(BRAND_STAR_MAX, count)),
    },
    name: {
      parts,
      size: (BRAND_NAME_SIZES as readonly unknown[]).includes(name.size) ? name.size : 'm',
      bold: typeof name.bold === 'boolean' ? name.bold : true,
    },
  };
}
