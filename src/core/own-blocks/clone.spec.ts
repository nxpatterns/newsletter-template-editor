import { resolveSlot, setColorMode } from '../colors/edit';
import { STANDARD_SETS } from '../colors/model';
import { normalizeNewsletter } from '../persist/normalize-newsletter';
import { emptyFreeData, quickStart } from '../parts/operations';
import { renderExport, renderPreview } from '../render';
import { blankNewsletter } from '../seed';
import { createBlock, type PriceBoxBlock } from '../types';
import {
  CLONE_BLOCK_ID,
  cloneContentOf,
  cloneWorkDocument,
  newCloneContent,
  newFreeContent,
  normalizeCloneContent,
  placeOwnBlock,
  replaceableBlocks,
  replaceBlocksWithClone,
  sameCloneContent,
  setCloneColor,
} from './clone';

const price = () => createBlock('price-box') as PriceBoxBlock;
const ref = { blockId: 'own-1', version: 1 };

describe('clone content', () => {
  it('starts from the built-in block with the type default colors', () => {
    const c = newCloneContent(price());
    expect(c.kind).toBe('clone');
    expect(c.block.id).toBe(CLONE_BLOCK_ID);
    expect(c.block.type).toBe('price-box');
    expect(c.colors).toEqual({});
  });

  it('puts the copy into a working document with the template colors and reads it back', () => {
    const base = blankNewsletter('de').globals;
    base.colors.light.general.accent = '#aa0000';
    const c = { ...newCloneContent(price()), colors: { badge: { role: 'link' as const } } };
    const doc = cloneWorkDocument(c, base);
    expect(doc.blocks).toHaveLength(1);
    expect(doc.globals.colors.light.general.accent).toBe('#aa0000');
    for (const mode of ['dark', 'light'] as const) {
      expect(doc.globals.colors[mode].blocks[CLONE_BLOCK_ID]).toEqual({ badge: { role: 'link' } });
    }
    expect(cloneContentOf(doc)).toEqual(c);
  });

  it('never carries the colors of other template blocks into the working document', () => {
    const base = blankNewsletter('de').globals;
    base.colors.dark.blocks['other'] = { background: { hex: '#123456' } };
    const doc = cloneWorkDocument(newCloneContent(price()), base);
    expect(doc.globals.colors.dark.blocks).toEqual({});
  });

  it('sets one color in Light and Dark, and null goes back to the default role', () => {
    const doc = cloneWorkDocument(newCloneContent(price()), blankNewsletter('de').globals);
    const fixed = setCloneColor(doc.globals.colors, 'price', { hex: '#FB923C' });
    expect(fixed.dark.blocks[CLONE_BLOCK_ID]).toEqual({ price: { hex: '#fb923c' } });
    expect(fixed.light.blocks[CLONE_BLOCK_ID]).toEqual({ price: { hex: '#fb923c' } });
    const back = setCloneColor(fixed, 'price', null);
    expect(back.dark.blocks).toEqual({});
    expect(back.light.blocks).toEqual({});
    expect(setCloneColor(doc.globals.colors, 'price', { hex: 'nope' })).toBe(doc.globals.colors);
  });

  it('normalizes stored content and rejects anything that is not a clone', () => {
    expect(normalizeCloneContent({ title: 'x' })).toBeNull();
    const c = normalizeCloneContent({
      kind: 'clone',
      block: { id: 'x', type: 'price-box', badge: 'Neu', own: ref },
      colors: { price: { hex: '#ABC' }, unknown: { role: 'head' }, badge: { role: 'nope' } },
    });
    expect(c?.block.id).toBe(CLONE_BLOCK_ID);
    expect((c?.block as PriceBoxBlock).badge).toBe('Neu');
    expect((c?.block as PriceBoxBlock).currency).toBe('€');
    expect(c?.block.own).toBeUndefined();
    expect(c?.colors).toEqual({ price: { hex: '#aabbcc' } });
  });

  it('compares content by meaning, not by key order', () => {
    const a = newCloneContent(price());
    const b = normalizeCloneContent(JSON.parse(JSON.stringify(a)))!;
    expect(sameCloneContent(a, b)).toBe(true);
    expect(sameCloneContent(a, { ...a, block: { ...a.block, badge: 'Other' } as PriceBoxBlock })).toBe(false);
  });
});

describe('placing an own block', () => {
  it('inserts the copy with its version and its colors on the block level of both sets', () => {
    const n = blankNewsletter('de');
    const content = { ...newCloneContent(price()), colors: { price: { hex: '#fb923c' }, badge: { role: 'link' as const } } };
    const next = placeOwnBlock(n, { content, ref, id: 'b-new', index: 0 });
    expect(next.blocks[0]).toMatchObject({ id: 'b-new', type: 'price-box', own: ref });
    expect(n.blocks).toHaveLength(0);
    for (const mode of ['dark', 'light'] as const) {
      const colors = setColorMode(next.globals.colors, mode);
      const target = { id: 'b-new', type: 'price-box' };
      expect(resolveSlot(colors, mode, target, 'price').hex).toBe('#fb923c');
      // A role follows the template it is used in.
      expect(resolveSlot(colors, mode, target, 'badge').hex).toBe(STANDARD_SETS[mode].link);
    }
  });

  it('places a free block that renders in preview and export at the template width, with its fixed colors', () => {
    const base = newFreeContent();
    const block = { ...base.block, ...quickStart(emptyFreeData(), 'twoColumns').data };
    const content = { ...base, block, colors: { 'n3.text': { hex: '#ff0000' } } };
    const n = placeOwnBlock(blankNewsletter('de'), { content, ref, id: 'b-free', index: 0 });
    expect(n.blocks[0]).toMatchObject({ id: 'b-free', type: 'free', own: ref });
    const html = renderExport(n).body;
    expect(html).toContain('width="244"');
    expect(html).toMatch(/color: #ff0000/);
    expect(renderPreview(n)).toContain('data-block-id="b-free"');
  });

  it('keeps the own block reference through storage', () => {
    const n = placeOwnBlock(blankNewsletter('de'), { content: newCloneContent(price()), ref, id: 'b-new', index: 0 });
    expect(normalizeNewsletter(JSON.parse(JSON.stringify(n))).blocks[0].own).toEqual(ref);
    const bad = { ...n, blocks: [{ ...n.blocks[0], own: { blockId: '', version: 0 } }] };
    expect('own' in normalizeNewsletter(bad).blocks[0]).toBe(false);
  });
});

describe('replacing placed blocks with the copy', () => {
  it('keeps texts, takes layout and colors from the copy and drops the own colors', () => {
    const placed = { ...price(), id: 'p1', amount: '42', strikeEnabled: true, currency: '$' };
    const other = { ...createBlock('hero'), id: 'h1' };
    const n = blankNewsletter('de');
    n.blocks = [placed, other];
    n.globals.colors.dark.blocks['p1'] = { details: { hex: '#010101' } };
    const copy = { ...price(), strikeEnabled: false, currency: '€', amount: '99' };
    const content = { ...newCloneContent(copy), colors: { price: { hex: '#fb923c' } } };
    expect(replaceableBlocks(n, 'price-box', ref.blockId).map((b) => b.id)).toEqual(['p1']);
    const next = replaceBlocksWithClone(n, { content, ref });
    expect(next.blocks[0]).toMatchObject({ id: 'p1', amount: '42', strikeEnabled: false, currency: '€', own: ref });
    expect(next.blocks[1]).toBe(other);
    expect(next.globals.colors.dark.blocks['p1']).toEqual({ price: { hex: '#fb923c' } });
    expect(next.globals.colors.light.blocks['p1']).toEqual({ price: { hex: '#fb923c' } });
    expect(replaceableBlocks(next, 'price-box', ref.blockId)).toEqual([]);
  });

  it('changes nothing when no block of the type is placed', () => {
    const n = blankNewsletter('de');
    expect(replaceBlocksWithClone(n, { content: newCloneContent(price()), ref })).toBe(n);
  });
});
