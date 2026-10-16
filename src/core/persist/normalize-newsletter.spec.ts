import {
  BENEFIT_DEFAULT_ICON,
  CTA_LINK_DEFAULT_ICON,
  CTA_LINK_ICONS,
  createBlock,
  emptyCtaLinkListItem,
  type BenefitsListBlock,
  type ChapterBandBlock,
  type CtaLinkListBlock,
  type HeroBlock,
  type Newsletter,
  type PriceBoxBlock,
  type PullQuoteBlock,
  type TestimonialBlock,
  type StatBoxBlock,
} from '../types';
import { renderExport, renderPreview } from '../render';
import { seedNewsletter } from '../seed';
import { defaultGlobals, emptyNewsletter } from '../brand/defaults';
import {
  normalizeBenefitsListBlock,
  normalizeBrand,
  normalizeChapterBandBlock,
  normalizeCtaLinkListBlock,
  normalizeHeroBlock,
  normalizeNewsletter,
  normalizePriceBoxBlock,
  normalizePullQuoteBlock,
  normalizeStatBoxBlock,
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
      schemaVersion: 2,
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
    expect(html).not.toContain('class="price-strike');
    expect(html).not.toContain('data-field="strikeAmount"');
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
      schemaVersion: 2,
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

describe('normalizeHeroBlock', () => {
  it('migrates legacy headlineHtml to plain headline', () => {
    const next = normalizeHeroBlock({
      id: 'h1',
      label: 'Intro',
      headlineHtml: '<em>How do you enter?</em>',
    });
    expect(next).toEqual({
      id: 'h1',
      type: 'hero',
      label: 'Intro',
      headline: 'How do you enter?',
    });
    expect('headlineHtml' in next).toBe(false);
  });

  it('keeps plain headline without re-stripping', () => {
    const next = normalizeHeroBlock({
      id: 'h2',
      label: 'L',
      headline: 'A < B always',
    });
    expect(next.headline).toBe('A < B always');
  });
});

describe('hero render', () => {
  it('escapes plain headline and keeps italic via CSS class', () => {
    const n = seedNewsletter();
    const hero = n.blocks.find((b) => b.type === 'hero') as HeroBlock;
    hero.headline = 'Safe <em>not markup</em> & done';
    const html = renderExport(n).full;
    expect(html).toContain('data-field="headline"');
    expect(html).toContain('Safe &lt;em&gt;not markup&lt;/em&gt; &amp; done');
    expect(html).not.toContain('headlineHtml');
    expect(html).toContain('hero-headline');
    expect(html).toMatch(/font-style:\s*italic/);
  });

  it('createBlock defaults to plain headline', () => {
    const block = createBlock('hero') as HeroBlock;
    expect(block.headline).toBe('New headline');
    expect((block as { headlineHtml?: string }).headlineHtml).toBeUndefined();
  });
});

describe('chapter / quote / stat plain-up', () => {
  it('migrates legacy titleHtml html geoHtml fields', () => {
    expect(
      normalizeChapterBandBlock({
        id: 'ch1',
        titleHtml: '<strong>Chapter</strong>',
      }),
    ).toEqual({ id: 'ch1', type: 'chapter-band', title: 'Chapter' });

    expect(
      normalizePullQuoteBlock({
        id: 'q1',
        html: '„Line one<br>Line two“',
      }),
    ).toEqual({ id: 'q1', type: 'pull-quote', quote: '„Line one\nLine two“' });

    expect(
      normalizeStatBoxBlock({
        id: 's1',
        number: '10',
        label: 'Units',
        geoHtml: 'AT<br>DE',
      }),
    ).toEqual({ id: 's1', type: 'stat-box', number: '10', label: 'Units', geo: 'AT\nDE' });
  });

  it('renders escaped plain fields and geo line breaks from seed', () => {
    const n = seedNewsletter();
    const html = renderExport(n).full;
    expect(html).toContain('data-field="title"');
    expect(html).toContain('data-field="quote"');
    expect(html).toContain('data-field="geo"');
    expect(html).toContain('Österreich · Deutschland<br>Schweiz · Südtirol');
    expect(html).not.toContain('titleHtml');
    expect(html).not.toContain('geoHtml');

    const quote = n.blocks.find((b) => b.type === 'pull-quote') as PullQuoteBlock;
    quote.quote = 'Safe <b>x</b>';
    const escaped = renderExport(n).full;
    expect(escaped).toContain('Safe &lt;b&gt;x&lt;/b&gt;');
  });

  it('drops empty byline fields from a stored pull quote', () => {
    expect(
      normalizePullQuoteBlock({ id: 'q2', quote: 'Q', name: '', role: '', imageMode: 'none', src: '', alt: '' }),
    ).toEqual({ id: 'q2', type: 'pull-quote', quote: 'Q' });
  });

  it('converts a stored pull quote with name, role or picture into a testimonial', () => {
    const n = normalizeNewsletter({
      schemaVersion: 4,
      globals: {},
      blocks: [
        { id: 'a', type: 'pull-quote', quote: 'Q', name: 'Sam Keller', role: 'Owner', imageMode: 'none', src: '', alt: '' },
        { id: 'b', type: 'pull-quote', quote: 'Q', name: '', role: '', imageMode: 'logo', src: 'https://x/l.png', alt: 'L' },
        { id: 'c', type: 'pull-quote', quote: 'Plain' },
      ],
    } as unknown as Newsletter);
    expect(n.blocks).toEqual([
      { id: 'a', type: 'testimonial', quote: 'Q', name: 'Sam Keller', role: 'Owner', imageMode: 'none', src: '', alt: '' },
      { id: 'b', type: 'testimonial', quote: 'Q', name: '', role: '', imageMode: 'logo', src: 'https://x/l.png', alt: 'L' },
      { id: 'c', type: 'pull-quote', quote: 'Plain' },
    ]);
  });

  it('createBlock defaults use plain fields', () => {
    expect((createBlock('chapter-band') as ChapterBandBlock).title).toBe('Chapter title');
    expect((createBlock('pull-quote') as PullQuoteBlock).quote).toContain('memorable');
    expect((createBlock('testimonial') as TestimonialBlock).name).toBe('Sam Keller');
    expect((createBlock('stat-box') as StatBoxBlock).geo).toContain('Region');
  });
});

describe('normalizeBenefitsListBlock', () => {
  it('migrates legacy string[] items to icon+text rows', () => {
    const next = normalizeBenefitsListBlock({
      id: 'b1',
      items: ['One', 'Two'],
    });
    expect(next.items).toEqual([
      { icon: BENEFIT_DEFAULT_ICON, text: 'One' },
      { icon: BENEFIT_DEFAULT_ICON, text: 'Two' },
    ]);
  });

  it('keeps custom icons and at least one row', () => {
    const next = normalizeBenefitsListBlock({
      id: 'b2',
      items: [{ icon: '★', text: 'Star perk' }],
    });
    expect(next.items[0].icon).toBe('★');
    expect(normalizeBenefitsListBlock({ id: 'b3' }).items.length).toBe(1);
  });
});

describe('benefits-list render', () => {
  it('renders per-row icons from seed', () => {
    const n = seedNewsletter();
    const html = renderExport(n).full;
    expect(html).toMatch(/data-item-key="icon"[^>]*>›\s*</);
    expect(html).toMatch(/data-item-key="text"[^>]*>\s*Dedizierter Unternehmenseintrag/);
  });

  it('keeps benefit class hooks and inlines layout on export', () => {
    const n = seedNewsletter();
    const html = renderExport(n).full;
    expect(html).toContain('benefit-row');
    expect(html).toContain('benefit-row-cell');
    expect(html).toContain('benefit-icon');
    expect(html).toContain('benefit-text');
    // Inliner bakes typography onto the text span / cells.
    expect(html).toMatch(/font-size:\s*16px/);
  });

  it('createBlock uses structured benefit rows', () => {
    const block = createBlock('benefits-list') as BenefitsListBlock;
    expect(block.items[0].icon).toBe(BENEFIT_DEFAULT_ICON);
    expect(block.items[0].text).toBe('Benefit one');
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

describe('neutral fallbacks', () => {
  const noCloudLib = (value: unknown) => expect(JSON.stringify(value).toLowerCase()).not.toContain('cloudlib');

  it('fills an empty or partial newsletter without any CloudLib value', () => {
    noCloudLib(normalizeNewsletter({} as Newsletter));
    noCloudLib(normalizeNewsletter({ schemaVersion: 1, globals: {}, blocks: [] } as unknown as Newsletter));
    noCloudLib(
      normalizeNewsletter({
        schemaVersion: 4,
        globals: { brand: { name: { parts: [{ text: 'X', color: 'bad' }] } }, legal: {} },
        blocks: [{ id: 'q', type: 'pull-quote' }],
      } as unknown as Newsletter),
    );
    // Brand parts are split ("Cloud" + "Lib"), so check the joined name too.
    noCloudLib(normalizeBrand(undefined).name.parts.map((p) => p.text).join(''));
  });

  it('keeps the default globals and the empty newsletter free of CloudLib', () => {
    noCloudLib(defaultGlobals());
    noCloudLib(emptyNewsletter());
  });
});
