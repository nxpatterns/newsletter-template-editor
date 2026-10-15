import { seedNewsletter } from '../seed';
import type { Newsletter } from '../types';
import { migrateRichHtmlV1ToV2 } from './migrate-v2';
import { normalizeNewsletter } from './normalize-newsletter';

/** A v1 document as older builds stored it (old color/size tokens and globals keys). */
function v1Doc(): Newsletter {
  const { globals } = seedNewsletter();
  const {
    secondaryColor: _s,
    accentColor: _a,
    primaryColor: _p,
    standardColor: _st,
    ...rest
  } = globals;
  return {
    schemaVersion: 1,
    globals: {
      ...rest,
      accentColor: '#0000ff',
      goldColor: '#ffcc00',
      headingColor: '#ffffff',
      bodyTextColor: '#888888',
    },
    blocks: [
      {
        id: 'p1',
        type: 'paragraph',
        body: [
          {
            type: 'p',
            color: 'heading',
            children: [
              { type: 'text', text: 'Blue ', marks: { color: 'accent', size: 'lead' } },
              { type: 'text', text: 'gold', marks: { color: 'gold', size: 'callout' } },
              { type: 'text', text: ' small', marks: { size: 'caption' } },
            ],
          },
        ],
      },
      { id: 'd1', type: 'divider', style: 'accent-double' },
    ],
  } as unknown as Newsletter;
}

describe('schema v1 → v2 migration', () => {
  it('renames globals keys in one pass (accent→secondary, gold→accent)', () => {
    const g = normalizeNewsletter(v1Doc()).globals as unknown as Record<string, unknown>;
    expect(g['secondaryColor']).toBe('#0000ff');
    expect(g['accentColor']).toBe('#ffcc00');
    expect(g['primaryColor']).toBe('#ffffff');
    expect(g['standardColor']).toBe('#888888');
    expect(g['goldColor']).toBeUndefined();
    expect(g['headingColor']).toBeUndefined();
    expect(g['bodyTextColor']).toBeUndefined();
  });

  it('maps paragraph color and size tokens', () => {
    const n = normalizeNewsletter(v1Doc());
    const p = n.blocks[0];
    if (p.type !== 'paragraph') throw new Error('expected paragraph');
    expect(p.body[0].color).toBe('primary');
    const marks = p.body[0].children.map((c) => (c.type === 'text' ? c.marks : undefined));
    expect(marks[0]).toMatchObject({ color: 'secondary', size: 'l' });
    expect(marks[1]).toMatchObject({ color: 'accent', size: 'xl' });
    expect(marks[2]).toMatchObject({ size: 'xs' });
  });

  it('renames the divider accent-double style', () => {
    const d = normalizeNewsletter(v1Doc()).blocks[1];
    expect(d.type === 'divider' && d.style).toBe('secondary-double');
  });

  it('stamps the current schema version', () => {
    expect(normalizeNewsletter(v1Doc()).schemaVersion).toBe(2);
  });

  it('leaves v2 documents untouched', () => {
    const seed = seedNewsletter();
    expect(normalizeNewsletter(structuredClone(seed))).toEqual(seed);
  });

  it('rewrites legacy paragraph HTML classes in one pass', () => {
    const html =
      '<p class="paragraph-body text-heading"><span class="text-accent rt-size-callout">a</span>' +
      '<span class="text-gold" data-rt-color="gold" data-rt-size="caption">b</span></p>';
    expect(migrateRichHtmlV1ToV2(html)).toBe(
      '<p class="paragraph-body text-primary"><span class="text-secondary rt-size-xl">a</span>' +
        '<span class="text-accent" data-rt-color="accent" data-rt-size="xs">b</span></p>',
    );
  });
});
