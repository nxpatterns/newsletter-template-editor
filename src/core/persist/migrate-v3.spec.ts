import { seedNewsletter } from '../seed';
import type { DividerBlock, Newsletter } from '../types';
import { normalizeNewsletter } from './normalize-newsletter';

function docWith(schemaVersion: number, dividers: Record<string, unknown>[]): Newsletter {
  return {
    schemaVersion,
    globals: seedNewsletter().globals,
    blocks: dividers.map((d, i) => ({ id: `d${i}`, type: 'divider', ...d })),
  } as unknown as Newsletter;
}

describe('schema v3 divider migration', () => {
  it('renames secondary-double to two-tone and fills the background token', () => {
    const n = normalizeNewsletter(docWith(2, [{ style: 'secondary-double' }, { style: 'thin' }]));
    const [a, b] = n.blocks as DividerBlock[];
    expect(n.schemaVersion).toBe(3);
    expect(a).toEqual({ id: 'd0', type: 'divider', style: 'two-tone', background: 'content' });
    expect(b.style).toBe('thin');
  });

  it('chains v1 accent-double through v2 to two-tone', () => {
    const n = normalizeNewsletter(docWith(1, [{ style: 'accent-double' }]));
    expect((n.blocks[0] as DividerBlock).style).toBe('two-tone');
  });

  it('keeps a valid page background and height, falls back on unknown values', () => {
    const n = normalizeNewsletter(
      docWith(3, [
        { style: 'spacer-only', background: 'page', heightPx: 40 },
        { style: 'zigzag', background: '#ff0000' },
      ]),
    );
    const [a, b] = n.blocks as DividerBlock[];
    expect(a).toEqual({ id: 'd0', type: 'divider', style: 'spacer-only', background: 'page', heightPx: 40 });
    expect(b.style).toBe('thin');
    expect(b.background).toBe('content');
  });
});
