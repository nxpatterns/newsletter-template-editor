import {
  createBlock,
  type CtaLinkListBlock,
  type Newsletter,
  type PriceBoxBlock,
} from '../types';
import { renderExport } from '../render';
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
});
