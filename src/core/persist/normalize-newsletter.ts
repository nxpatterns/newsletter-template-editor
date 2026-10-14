import {
  BENEFIT_DEFAULT_ICON,
  CTA_LINK_DEFAULT_ICON,
  CURRENT_SCHEMA_VERSION,
  emptyBenefitsListItem,
  emptyCtaLinkListItem,
  type BenefitsListBlock,
  type BenefitsListItem,
  type Block,
  type ChapterBandBlock,
  type CtaLinkListBlock,
  type CtaLinkListItem,
  type HeroBlock,
  type Newsletter,
  type PriceBoxBlock,
  type PullQuoteBlock,
  type StatBoxBlock,
} from '../types';

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
  return {
    id,
    type: 'pull-quote',
    quote: pickPlainField(raw.quote, raw.html, true),
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

function normalizeBlocks(blocks: Block[]): Block[] {
  return blocks.map((block) => {
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
export function normalizeNewsletter(n: Newsletter): Newsletter {
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
  }

  return {
    ...n,
    schemaVersion: n.schemaVersion || CURRENT_SCHEMA_VERSION,
    blocks: Array.isArray(n.blocks) ? normalizeBlocks(n.blocks) : [],
  };
}
