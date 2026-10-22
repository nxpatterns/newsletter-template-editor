import { setBlockColor } from '../colors/edit';
import { blankNewsletter } from '../seed';
import { createBlock, type Block } from '../types';
import { blockFindings, isVagueLinkText } from './block-checks';

function docWith(block: Block) {
  const n = blankNewsletter('de');
  n.blocks = [block];
  return n;
}

describe('block checks', () => {
  it('finds nothing in a fresh built-in block', () => {
    for (const type of ['hero', 'price-box', 'cta-button', 'contact', 'teasers'] as const) {
      const b = createBlock(type);
      expect(blockFindings(docWith(b), b.id), type).toEqual([]);
    }
  });

  it('finds a hard to read fixed color in the set where it fails only', () => {
    const b = createBlock('hero');
    const n = docWith(b);
    n.globals.colors = setBlockColor(n.globals.colors, b.id, 'headline', { hex: '#0c1628' });
    const found = blockFindings(n, b.id);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'contrast', mode: 'dark', slot: 'headline', onSlot: 'background' });
  });

  it('finds an image without a description, but not an empty image', () => {
    const empty = createBlock('image');
    expect(blockFindings(docWith(empty), empty.id)).toEqual([]);
    const set = { ...empty, src: 'https://example.com/a.jpg' } as Block;
    expect(blockFindings(docWith(set), set.id)).toEqual([{ kind: 'missingAlt', field: 'alt' }]);
  });

  it('finds link texts that say nothing', () => {
    expect(isVagueLinkText(' Hier klicken! ')).toBe(true);
    expect(isVagueLinkText('Click here…')).toBe(true);
    expect(isVagueLinkText('Angebot ansehen')).toBe(false);
    const b = { ...createBlock('cta-button'), text: 'Hier klicken' } as Block;
    expect(blockFindings(docWith(b), b.id)).toEqual([{ kind: 'vagueLink', field: 'text', text: 'Hier klicken' }]);
  });
});
