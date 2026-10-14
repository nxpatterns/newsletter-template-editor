import {
  CTA_LINK_DEFAULT_ICON,
  CTA_LINK_ICONS,
  createBlock,
  emptyCtaLinkListItem,
  type CtaLinkListBlock,
  type Newsletter,
  type PriceBoxBlock,
} from '../types';
import { renderExport, renderPreview } from '../render';
import { seedNewsletter } from '../seed';
import {
  normalizeCtaLinkListBlock,
  normalizeNewsletter,
  normalizePriceBoxBlock,
  splitPriceLine,
} from './normalize-newsletter';

describe('splitPriceLine', () => {
  it('parses German main price HTML blob', () => {
    const html =
      '<span style="font-size:16px;vertical-align:super;padding-right:4px;color:#f5c518">€</span>99 <span style="font-size:16px;font-weight:300;color:#4a6a88">netto / Jahr</span>';
    expect(splitPriceLine(html)).toEqual({
      prefix: '',
      currency: '€',
      amount: '99',
      periodLabel: 'netto / Jahr',
    });
  });

  it('parses strike line with label', () => {
    expect(splitPriceLine('Statt €199 netto / Jahr')).toEqual({
      prefix: 'Statt',
      currency: '€',
      amount: '199',
      periodLabel: 'netto / Jahr',
    });
  });
});

describe('normalizePriceBoxBlock', () => {
  it('migrates legacy mainPriceHtml + strike', () => {
    const next = normalizePriceBoxBlock(
      {
        id: 'p1',
        badge: 'Offer',
        strike: 'Was €199 / year',
        mainPriceHtml: '€99 <span>/ year</span>',
        details: 'details',
        fine: 'fine',
      },
      'fallback',
    );
    expect(next).toEqual({
      id: 'p1',
      type: 'price-box',
      badge: 'Offer',
      currency: '€',
      amount: '99',
      periodLabel: '/ year',
      strikeEnabled: true,
      strikeAmount: '199',
      strikeLabel: 'Was',
      details: 'details',
      fine: 'fine',
    });
  });

  it('keeps structured fields without re-parsing', () => {
    const next = normalizePriceBoxBlock({
      id: 'p2',
      badge: 'B',
      currency: 'CHF',
      amount: '120',
      periodLabel: '/ Jahr',
      strikeEnabled: false,
      strikeAmount: '',
      strikeLabel: '',
      details: '',
      fine: '',
    });
    expect(next.currency).toBe('CHF');
    expect(next.amount).toBe('120');
    expect(next.strikeEnabled).toBe(false);
  });
});

describe('normalizeNewsletter price-box', () => {
  it('rewrites legacy blocks in a document', () => {
    const legacy = {
      schemaVersion: 1,
      globals: seedNewsletter().globals,
      blocks: [
        {
          id: 'legacy-price',
          type: 'price-box',
          badge: 'Deal',
          strike: 'Statt €199 netto / Jahr',
          mainPriceHtml:
            '<span style="color:#f5c518">€</span>99 <span>netto / Jahr</span>',
          details: 'd',
          fine: 'f',
        },
      ],
    } as unknown as Newsletter;

    const normalized = normalizeNewsletter(legacy);
    const box = normalized.blocks[0] as PriceBoxBlock;
    expect(box.type).toBe('price-box');
    expect(box.currency).toBe('€');
    expect(box.amount).toBe('99');
    expect(box.periodLabel).toBe('netto / Jahr');
    expect(box.strikeLabel).toBe('Statt');
    expect(box.strikeAmount).toBe('199');
    expect(box.strikeEnabled).toBe(true);
    expect('mainPriceHtml' in box).toBe(false);
  });
});

describe('price-box render', () => {
  it('composes amount and strike from structured seed fields', () => {
    const n = seedNewsletter();
    const html = renderExport(n).full;
    expect(html).toContain('data-field="amount">99<');
    expect(html).toContain('data-field="strikeAmount">199<');
    expect(html).toContain('data-field="strikeLabel">Statt<');
    expect(html).not.toContain('mainPriceHtml');
  });

  it('hides strike line when disabled', () => {
    const n = seedNewsletter();
    const price = n.blocks.find((b) => b.type === 'price-box') as PriceBoxBlock;
    price.strikeEnabled = false;
    const html = renderExport(n).full;
    expect(html).not.toContain('text-price-strike');
    expect(html).toContain('data-field="amount">99<');
  });

  it('createBlock defaults are structured', () => {
    const block = createBlock('price-box');
    expect(block.type).toBe('price-box');
    if (block.type === 'price-box') {
      expect(block.currency).toBe('€');
      expect(block.amount).toBe('99');
      expect(block.strikeEnabled).toBe(true);
      expect((block as { mainPriceHtml?: string }).mainPriceHtml).toBeUndefined();
    }
  });
});

describe('cta link icon palette', () => {
  it('exposes about thirty email-safe glyphs and a default', () => {
    expect(CTA_LINK_DEFAULT_ICON).toBe('→');
    expect(CTA_LINK_ICONS.length).toBeGreaterThanOrEqual(28);
    expect(CTA_LINK_ICONS.length).toBeLessThanOrEqual(36);
    expect(new Set(CTA_LINK_ICONS).size).toBe(CTA_LINK_ICONS.length);
    expect(CTA_LINK_ICONS).toContain(CTA_LINK_DEFAULT_ICON);
    for (const glyph of CTA_LINK_ICONS) {
      expect(glyph.length).toBeGreaterThan(0);
      expect(glyph.length).toBeLessThanOrEqual(2);
    }
  });

  it('emptyCtaLinkListItem starts blank with default icon', () => {
    expect(emptyCtaLinkListItem()).toEqual({
      icon: CTA_LINK_DEFAULT_ICON,
      label: '',
      intro: '',
      linkText: '',
      href: '',
    });
  });
});

describe('normalizeCtaLinkListBlock', () => {
  it('fills missing icons and keeps fields', () => {
    const next = normalizeCtaLinkListBlock({
      id: 'c1',
      items: [{ label: 'Call', intro: 'Soon', linkText: 'Go', href: 'https://x.test' }],
    });
    expect(next.items).toEqual([
      {
        icon: '→',
        label: 'Call',
        intro: 'Soon',
        linkText: 'Go',
        href: 'https://x.test',
      },
    ]);
  });

  it('keeps at least one empty row when items missing', () => {
    const next = normalizeCtaLinkListBlock({ id: 'c2' });
    expect(next.items.length).toBe(1);
    expect(next.items[0].icon).toBe('→');
    expect(next.items[0].label).toBe('');
  });

  it('preserves many rows and custom icons', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      icon: i % 2 === 0 ? '★' : '•',
      label: `Row ${i + 1}`,
      intro: i === 0 ? 'Intro' : '',
      linkText: i === 1 ? 'Go' : '',
      href: i === 1 ? 'https://example.com' : '',
    }));
    const next = normalizeCtaLinkListBlock({ id: 'c-many', items });
    expect(next.items.length).toBe(8);
    expect(next.items[0].icon).toBe('★');
    expect(next.items[7].label).toBe('Row 8');
  });

  it('runs through normalizeNewsletter for legacy seed rows without icon', () => {
    const legacy = {
      schemaVersion: 1,
      globals: seedNewsletter().globals,
      blocks: [
        {
          id: 'legacy-cta',
          type: 'cta-link-list',
          items: [{ label: 'Only title', intro: '', linkText: '', href: '' }],
        },
      ],
    } as unknown as Newsletter;
    const normalized = normalizeNewsletter(legacy);
    const list = normalized.blocks[0] as CtaLinkListBlock;
    expect(list.type).toBe('cta-link-list');
    expect(list.items[0].icon).toBe(CTA_LINK_DEFAULT_ICON);
    expect(list.items[0].label).toBe('Only title');
  });
});

describe('cta-link-list render', () => {
  it('renders per-row icons from seed', () => {
    const n = seedNewsletter();
    const html = renderExport(n).full;
    expect(html).toMatch(/data-item-key="icon"[^>]*>→</);
    expect(html).toMatch(/data-item-key="icon"[^>]*>•</);
    expect(html).toContain('data-item-key="label">Termin vereinbaren:<');
  });

  it('createBlock includes default icon', () => {
    const block = createBlock('cta-link-list') as CtaLinkListBlock;
    expect(block.items[0].icon).toBe('→');
  });

  it('omits anchor when link text or href is empty', () => {
    const n = seedNewsletter();
    const list = n.blocks.find((b) => b.type === 'cta-link-list') as CtaLinkListBlock;
    list.items = [
      {
        icon: '★',
        label: 'Title only',
        intro: 'No link here',
        linkText: '',
        href: '',
      },
      {
        icon: '→',
        label: 'With link:',
        intro: 'Click',
        linkText: 'Open',
        href: 'https://cloudlib.eu',
      },
    ];
    const html = renderPreview(n);
    expect(html).toMatch(/data-item-key="icon"[^>]*>★</);
    expect(html).toContain('data-item-key="label">Title only<');
    expect(html).toContain('data-item-key="linkText">Open<');
    expect(html).toContain('https://cloudlib.eu');
    // First row must not invent a link from empty fields.
    const firstRowSlice = html.slice(
      html.indexOf('Title only') - 200,
      html.indexOf('Title only') + 200,
    );
    expect(firstRowSlice).not.toMatch(/<a\s/i);
  });
});
