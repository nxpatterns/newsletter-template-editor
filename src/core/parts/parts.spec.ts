import { describe, expect, it } from 'vitest';
import { defaultGlobals } from '../brand/defaults';
import { renderExport, renderPreview } from '../render';
import { normalizeNewsletter } from '../persist/normalize-newsletter';
import { CURRENT_SCHEMA_VERSION, createBlock, type FreeBlock, type Newsletter } from '../types';
import { freeColorSlots } from './colors';
import { narrowestLeaf, narrowPhoneColumns, refuseInsert, resolvedWidths } from './layout';
import { activeDesign, findNode, type ColumnsNode, type FreeBlockData } from './model';
import {
  addListItem,
  emptyFreeData,
  insertEmbed,
  insertPart,
  locate,
  movePart,
  movePartBy,
  quickStart,
  removeListItem,
  removePart,
  setColumnCount,
  setContent,
  setPartProps,
} from './operations';
import { columnWidths } from './render';

const free = (data: FreeBlockData, id = 'f1'): FreeBlock => ({ id, type: 'free', ...data });

function doc(...blocks: Newsletter['blocks']): Newsletter {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, globals: defaultGlobals(), blocks };
}

function twoColumns(): FreeBlockData {
  return quickStart(emptyFreeData(), 'twoColumns').data;
}

describe('parts operations', () => {
  it('builds the quick start "two columns" as image left, headline, text and button right', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    expect(row.kind).toBe('columns');
    expect(row.columns.map((c) => c.children.map((n) => n.kind))).toEqual([['image'], ['text', 'text', 'button']]);
    expect(data.content.parts.map((p) => p.kind)).toEqual(['image', 'text', 'text', 'button']);
  });

  it('never changes the input', () => {
    const data = emptyFreeData();
    const before = JSON.stringify(data);
    insertPart(data, 'text', { parent: null, index: 0 });
    expect(JSON.stringify(data)).toBe(before);
  });

  it('moves a part up and down and into another container', () => {
    let data = quickStart(emptyFreeData(), 'textButton').data;
    const [headline, , button] = activeDesign(data).children.map((n) => n.id);
    data = movePartBy(data, button!, -1);
    expect(locate(data, button!)).toEqual({ parent: null, index: 1 });
    const box = insertPart(data, 'box', { parent: null, index: 0 });
    data = movePart(box.data, headline!, { parent: box.nodeId, index: 0 });
    expect(locate(data, headline!)).toEqual({ parent: box.nodeId, index: 0 });
  });

  it('refuses to move a part into itself', () => {
    const box = insertPart(emptyFreeData(), 'box', { parent: null, index: 0 });
    const inner = insertPart(box.data, 'box', { parent: box.nodeId, index: 0 });
    expect(movePart(inner.data, box.nodeId!, { parent: inner.nodeId, index: 0 })).toBe(inner.data);
  });

  it('removes a part with the content only it showed', () => {
    const data = quickStart(emptyFreeData(), 'textButton').data;
    const button = activeDesign(data).children[2]!;
    const next = removePart(data, button.id);
    expect(next.content.parts.some((p) => p.kind === 'button')).toBe(false);
  });

  it('adds a column up to four and picks the first ratio of the count', () => {
    let data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    data = insertPart(data, 'column', { parent: row.id, index: 2 }).data;
    data = insertPart(data, 'column', { parent: row.id, index: 3 }).data;
    const four = findNode(activeDesign(data).children, row.id) as ColumnsNode;
    expect(four.columns).toHaveLength(4);
    expect(four.ratio).toBe('1:1:1:1');
    expect(insertPart(data, 'column', { parent: row.id, index: 4 }).nodeId).toBeNull();
  });

  it('hands the parts of removed columns to the column before', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    const one = findNode(activeDesign(setColumnCount(data, row.id, 1)).children, row.id) as ColumnsNode;
    expect(one.columns[0]!.children.map((n) => n.kind)).toEqual(['image', 'text', 'text', 'button']);
  });

  it('keeps one content per list item and at least one item', () => {
    const list = insertPart(emptyFreeData(), 'list', { parent: null, index: 0 });
    const collection = list.data.content.collections[0]!;
    expect(collection.items).toHaveLength(2);
    const three = addListItem(list.data, collection.id);
    expect(three.content.collections[0]!.items).toHaveLength(3);
    // A part placed in the item design appears in every item.
    const withIcon = insertPart(three, 'icon', { parent: list.nodeId, index: 0 });
    expect(withIcon.data.content.collections[0]!.items.every((i) => i.parts.some((p) => p.kind === 'icon'))).toBe(true);
    let one = list.data;
    one = removeListItem(one, collection.id, collection.items[0]!.id);
    expect(removeListItem(one, collection.id, one.content.collections[0]!.items[0]!.id)).toBe(one);
  });

  it('sets design props and clears them with undefined', () => {
    const data = quickStart(emptyFreeData(), 'textButton').data;
    const id = activeDesign(data).children[0]!.id;
    const bold = setPartProps(data, id, { size: '2xl' });
    expect((findNode(activeDesign(bold).children, id) as { size?: string }).size).toBe('2xl');
    const cleared = setPartProps(bold, id, { size: undefined });
    expect('size' in findNode(activeDesign(cleared).children, id)!).toBe(false);
  });
});

describe('parts widths and floors', () => {
  it('splits a row by ratio after the gap, the rest to the last column', () => {
    expect(columnWidths(504, { ratio: '1:2', gap: 'm', columns: [{ id: 'a', children: [] }, { id: 'b', children: [] }] })).toEqual([162, 326]);
  });

  it('resolves widths through nested parts from the available width', () => {
    const data = twoColumns();
    const widths = resolvedWidths(data);
    const row = activeDesign(data).children[0] as ColumnsNode;
    expect(widths.get(row.id)).toBe(504);
    expect(widths.get(row.columns[0]!.id)).toBe(244);
  });

  it('refuses a text where it would get less than 120 px', () => {
    let data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    data = setColumnCount(data, row.id, 4);
    const inner = insertPart(data, 'columns', { parent: row.columns[0]!.id, index: 0 });
    const col = (findNode(activeDesign(inner.data).children, inner.nodeId!) as ColumnsNode).columns[0]!.id;
    expect(refuseInsert(inner.data, 'text', { parent: col, index: 0 })).toMatchObject({ reason: 'tooNarrow', min: 120 });
  });

  it('allows columns inside columns only once', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    const inner = insertPart(data, 'columns', { parent: row.columns[0]!.id, index: 0 });
    const col = (findNode(activeDesign(inner.data).children, inner.nodeId!) as ColumnsNode).columns[0]!.id;
    expect(refuseInsert(inner.data, 'columns', { parent: col, index: 0 })).toEqual({ reason: 'columnsDepth' });
  });

  it('refuses an embedded block narrower than 280 px', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    expect(refuseInsert(data, 'block', { parent: row.columns[0]!.id, index: 0 }, { embedded: createBlock('event') })).toMatchObject({ reason: 'tooNarrow', min: 280 });
  });

  it('finds the narrowest part below its floor', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    expect(narrowestLeaf(data)).toBeNull();
    expect(narrowestLeaf(setColumnCount(data, row.id, 4))).toMatchObject({ min: 120 });
  });

  it('warns about non-stacking columns narrower than 120 px on a phone', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    const kept = setPartProps(setColumnCount(data, row.id, 3), row.id, { stack: false });
    expect(narrowPhoneColumns(kept)).toEqual([row.id]);
  });
});

describe('free block renderer', () => {
  it('renders nested presentation tables with px widths for Outlook', () => {
    const data = setContent(twoColumns(), 'img1', { src: 'https://example.com/a.png', alt: 'Terrace' });
    const html = renderExport(doc(free(data))).body;
    expect(html).toContain('width="244"');
    expect(html).toMatch(/<img[^>]+src="https:\/\/example.com\/a.png"[^>]+width="244"/);
    expect(html).toContain('role="presentation"');
    expect(html).not.toMatch(/<div/);
  });

  it('stacks columns on phones unless told not to, reversed with dir="rtl"', () => {
    const data = twoColumns();
    const row = activeDesign(data).children[0] as ColumnsNode;
    const css = renderPreview(doc(free(data)));
    expect(css).toContain('fp-col-s');
    const reversed = renderPreview(doc(free(setPartProps(data, row.id, { reversed: true }))));
    expect(reversed).toContain('dir="rtl"');
    const kept = renderPreview(doc(free(setPartProps(data, row.id, { stack: false }))));
    expect(kept).not.toMatch(/class="fp-col fp-col-s/);
  });

  it('writes bgcolor for the block background and filled buttons', () => {
    const html = renderExport(doc(free(quickStart(emptyFreeData(), 'textButton').data))).body;
    expect(html).toMatch(/<td bgcolor="#[0-9a-f]{6}" class="fb-root/);
    expect(html).toMatch(/class="fp-btn-cell[^"]*"[^>]*bgcolor="#1d6bb8"/);
  });

  it('maps a headline to h2 and wraps links with TrackLink in the export', () => {
    const html = renderExport(doc(free(quickStart(emptyFreeData(), 'textButton').data))).body;
    expect(html).toMatch(/<h2 class="fp-p fp-t-xl-tight/);
    expect(html).toContain('{{ TrackLink "https://example.com" }}');
  });

  it('colors parts by role and keeps a fixed color in the block (decision 35)', () => {
    const data = quickStart(emptyFreeData(), 'textButton').data;
    const keys = freeColorSlots(data).map((s) => s.key);
    expect(keys).toEqual(['background', 'n1.text', 'n2.text', 'n3.fill', 'n3.text']);
    const n = doc(free(data));
    n.globals.colors.dark.blocks['f1'] = { 'n1.text': { hex: '#ff0000' } };
    const html = renderExport(n).body;
    expect(html).toMatch(/<h2[^>]*style="[^"]*color: #ff0000/);
  });

  it('embeds a built-in block at the width of its column', () => {
    const data = insertEmbed(emptyFreeData(), { block: createBlock('cta-button') }, { parent: null, index: 0 }).data;
    const html = renderExport(doc(free(data))).body;
    expect(html).toContain('fp-embed');
    expect(html).toContain('cta-button-cell');
  });

  it('survives storage: normalize keeps known parts and drops unknown ones', () => {
    const raw = JSON.parse(JSON.stringify(doc(free(twoColumns()))));
    raw.blocks[0].designs[0].children.push({ id: 'x1', kind: 'video' });
    raw.blocks[0].designs[0].style.size = 'huge';
    const n = normalizeNewsletter(raw);
    const b = n.blocks[0] as FreeBlock;
    expect(activeDesign(b).children).toHaveLength(1);
    expect(activeDesign(b).style.size).toBeUndefined();
    expect(b.content.parts).toHaveLength(4);
  });
});
