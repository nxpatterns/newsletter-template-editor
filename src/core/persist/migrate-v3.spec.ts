import { seedNewsletter } from '../seed';
import { CURRENT_SCHEMA_VERSION, type DividerBlock, type Newsletter } from '../types';
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
    expect(n.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
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

  it('fills missing image fields and falls back to text width', () => {
    const n = normalizeNewsletter({
      schemaVersion: 3,
      globals: seedNewsletter().globals,
      blocks: [{ id: 'i', type: 'image', src: 'https://x.eu/a.png', width: 'huge' }],
    } as unknown as Newsletter);
    expect(n.blocks[0]).toEqual({
      id: 'i',
      type: 'image',
      src: 'https://x.eu/a.png',
      alt: '',
      href: '',
      caption: '',
      width: 'text',
    });
  });

  it('fills missing image and text fields with the defaults', () => {
    const n = normalizeNewsletter({
      schemaVersion: 3,
      globals: seedNewsletter().globals,
      blocks: [{ id: 'it', type: 'image-text', src: 'https://x.eu/a.png', side: 'top', valign: 'middle' }],
    } as unknown as Newsletter);
    const b = n.blocks[0];
    expect(b).toMatchObject({ id: 'it', type: 'image-text', src: 'https://x.eu/a.png', alt: '', href: '', side: 'left', imageWidth: 'third', valign: 'middle' });
    expect(b.type === 'image-text' && Array.isArray(b.body)).toBe(true);
  });
});
