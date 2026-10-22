import type { SlotColor } from '../colors/model';
import { emptyRichDoc } from '../richtext/model';
import type { Block } from '../types';
import {
  activeDesign,
  childrenOf,
  findNode,
  isInListItem,
  pathTo,
  walkNodes,
  type BlockStyle,
  type ColumnsNode,
  type ContentPart,
  type Design,
  type FreeBlockData,
  type LayoutNode,
  type ListNode,
  type PartKind,
  type TextNode,
  type TextRole,
  type TextStyle,
} from './model';
import { ratioParts, ratiosFor, type Ratio } from './scales';

/**
 * Pure operations of the block editor on a free block (decision 28): every one takes the block
 * data and an input and returns new data; the input data is never changed.
 */

/** Starting words for new parts, in the app language. */
export interface PartTexts {
  headline: string;
  body: string;
  button: string;
  listItems: readonly [string, string];
}

export const PART_TEXTS_EN: PartTexts = {
  headline: 'New headline',
  body: 'New text.',
  button: 'Learn more',
  listItems: ['First point', 'Second point'],
};

/** Parts the Parts tab offers; `column` adds a column to a row (decision 43, mockup R1). */
export type InsertKind = Exclude<PartKind, 'block'> | 'column';

/** Where a part goes: into a container (null = the block itself, or a column id), at an index. */
export interface Where {
  parent: string | null;
  index: number;
}

/** Look a text gets when it is created, by role. */
export const TEXT_ROLE_STYLE: Readonly<Record<TextRole, TextStyle>> = {
  headline: { size: 'xl', weight: 'bold', lineHeight: 'tight' },
  subline: { size: 'l', lineHeight: 'normal' },
  body: {},
  label: { size: 's', weight: 'bold', uppercase: true, letterSpacing: 'wide' },
  badge: { size: 'xs', weight: 'bold', uppercase: true, letterSpacing: 'wide' },
  price: { size: '3xl', weight: 'bold', lineHeight: 'tight' },
  name: { weight: 'bold' },
  quote: { size: 'l', italic: true },
  small: { size: 'xs' },
};

export function emptyFreeData(): FreeBlockData {
  return {
    content: { parts: [], collections: [] },
    designs: [{ id: 'd1', name: '', style: {}, children: [] }],
    active: 'd1',
  };
}

const clone = <T>(v: T): T => structuredClone(v);

/** All ids used in the block: nodes, columns, content parts, collections and items. */
function usedIds(data: FreeBlockData): Set<string> {
  const ids = new Set<string>();
  for (const d of data.designs) {
    walkNodes(d.children, (n) => {
      ids.add(n.id);
      if (n.kind === 'columns') n.columns.forEach((c) => ids.add(c.id));
    });
  }
  for (const p of data.content.parts) ids.add(p.id);
  for (const c of data.content.collections) {
    ids.add(c.id);
    for (const item of c.items) {
      ids.add(item.id);
      item.parts.forEach((p) => ids.add(p.id));
    }
  }
  return ids;
}

/** Short local ids (decision 24: ids inside one document may stay short). */
function idSource(data: FreeBlockData): (prefix: string) => string {
  const used = usedIds(data);
  return (prefix) => {
    let i = 1;
    while (used.has(`${prefix}${i}`)) i++;
    const id = `${prefix}${i}`;
    used.add(id);
    return id;
  };
}

function design(data: FreeBlockData): Design {
  const d = activeDesign(data);
  return data.designs.find((x) => x.id === d.id)!;
}

/** The child list a container id stands for, and the list its items belong to. */
function containerOf(d: Design, parent: string | null): { list: LayoutNode[]; listNode: ListNode | null } | null {
  if (parent === null) return { list: d.children, listNode: null };
  let hit: { list: LayoutNode[]; listNode: ListNode | null } | null = null;
  walkNodes(d.children, (n) => {
    if (hit) return;
    if (n.kind === 'columns') {
      const col = n.columns.find((c) => c.id === parent);
      if (col) hit = { list: col.children, listNode: isInListItem(d.children, n.id) };
    }
    if (n.id !== parent) return;
    if (n.kind === 'section' || n.kind === 'box') hit = { list: n.children, listNode: isInListItem(d.children, n.id) };
    if (n.kind === 'list') hit = { list: n.item, listNode: n };
  });
  return hit;
}

function newTextNode(id: string, part: string, role: TextRole): TextNode {
  return { id, kind: 'text', part, ...TEXT_ROLE_STYLE[role] };
}

/** Content and node for one new part; content goes to the block or, in a list, to every item. */
function buildPart(
  data: FreeBlockData,
  kind: Exclude<InsertKind, 'column'>,
  texts: PartTexts,
  next: (prefix: string) => string,
  listNode: ListNode | null,
  role?: TextRole,
): LayoutNode {
  const addContent = (make: (id: string) => ContentPart, prefix: string): string => {
    const id = next(prefix);
    if (listNode) {
      const collection = data.content.collections.find((c) => c.id === listNode.collection);
      collection?.items.forEach((item) => item.parts.push(make(id)));
    } else {
      data.content.parts.push(make(id));
    }
    return id;
  };
  switch (kind) {
    case 'section':
      return { id: next('n'), kind: 'section', children: [] };
    case 'box':
      return { id: next('n'), kind: 'box', padV: 'm', padH: 'm', children: [] };
    case 'columns':
      return { id: next('n'), kind: 'columns', ratio: '1:1', columns: [{ id: next('col'), children: [] }, { id: next('col'), children: [] }] };
    case 'list': {
      const collection = next('c');
      const textId = next('t');
      data.content.collections.push({
        id: collection,
        items: texts.listItems.map((t) => ({ id: next('it'), parts: [{ id: textId, kind: 'text', role: 'body', doc: emptyRichDoc(t) }] })),
      });
      return { id: next('n'), kind: 'list', collection, gap: 's', item: [newTextNode(next('n'), textId, 'body')] };
    }
    case 'text': {
      const r = role ?? 'body';
      const part = addContent((id) => ({ id, kind: 'text', role: r, doc: emptyRichDoc(r === 'headline' ? texts.headline : texts.body) }), 't');
      return newTextNode(next('n'), part, r);
    }
    case 'image': {
      const part = addContent((id) => ({ id, kind: 'image', role: 'image', src: '', alt: '', href: '' }), 'img');
      return { id: next('n'), kind: 'image', part, align: 'center' };
    }
    case 'button': {
      const part = addContent((id) => ({ id, kind: 'button', role: 'cta', text: texts.button, href: 'https://example.com' }), 'btn');
      return { id: next('n'), kind: 'button', part, variant: 'filled', size: 'm' };
    }
    case 'icon': {
      const part = addContent((id) => ({ id, kind: 'icon', role: 'icon', glyph: '✓' }), 'ic');
      return { id: next('n'), kind: 'icon', part, size: 'm' };
    }
    case 'divider':
      return { id: next('n'), kind: 'divider', line: 'solid', thickness: '1', padV: 's' };
    case 'spacer':
      return { id: next('n'), kind: 'spacer', height: 'l' };
  }
}

export interface InsertResult {
  data: FreeBlockData;
  /** The new part (or the row a column was added to). */
  nodeId: string | null;
}

/**
 * Add a part. `column` adds a column to the row `where.parent` names (a row id or a column id of
 * it), up to 4. Unknown places change nothing.
 */
export function insertPart(data: FreeBlockData, kind: InsertKind, where: Where, texts: PartTexts = PART_TEXTS_EN, role?: TextRole): InsertResult {
  const nextData = clone(data);
  const d = design(nextData);
  const next = idSource(nextData);
  if (kind === 'column') {
    const row = rowFor(d, where.parent);
    if (!row || row.columns.length >= 4) return { data, nodeId: null };
    const at = Math.max(0, Math.min(where.index, row.columns.length));
    row.columns.splice(at, 0, { id: next('col'), children: [] });
    row.ratio = ratiosFor(row.columns.length)[0]!;
    return { data: nextData, nodeId: row.id };
  }
  const target = containerOf(d, where.parent);
  if (!target) return { data, nodeId: null };
  const node = buildPart(nextData, kind, texts, next, target.listNode, role);
  target.list.splice(Math.max(0, Math.min(where.index, target.list.length)), 0, node);
  return { data: nextData, nodeId: node.id };
}

/** Insert an own or built-in block as an embedded part (decisions 38, 43). */
export function insertEmbed(data: FreeBlockData, input: { block: Block; colors?: Record<string, SlotColor> }, where: Where): InsertResult {
  const nextData = clone(data);
  const d = design(nextData);
  const target = containerOf(d, where.parent);
  if (!target || target.listNode) return { data, nodeId: null };
  const next = idSource(nextData);
  const part = next('b');
  nextData.content.parts.push({ id: part, kind: 'block', role: 'block', block: clone(input.block), ...(input.colors ? { colors: { ...input.colors } } : {}) });
  const node: LayoutNode = { id: next('n'), kind: 'block', part };
  target.list.splice(Math.max(0, Math.min(where.index, target.list.length)), 0, node);
  return { data: nextData, nodeId: node.id };
}

/** The row a parent id stands for: the row itself or one of its columns. */
function rowFor(d: Design, id: string | null): ColumnsNode | null {
  if (!id) return null;
  let hit: ColumnsNode | null = null;
  walkNodes(d.children, (n) => {
    if (!hit && n.kind === 'columns' && (n.id === id || n.columns.some((c) => c.id === id))) hit = n;
  });
  return hit;
}

/** Container id and index of a node; null when it is not in the design. */
export function locate(data: FreeBlockData, id: string): Where | null {
  const d = activeDesign(data);
  const scan = (list: readonly LayoutNode[], parent: string | null): Where | null => {
    const index = list.findIndex((n) => n.id === id);
    if (index >= 0) return { parent, index };
    for (const n of list) {
      let hit: Where | null = null;
      if (n.kind === 'columns') {
        for (const c of n.columns) {
          hit = scan(c.children, c.id);
          if (hit) return hit;
        }
      } else if (n.kind === 'section' || n.kind === 'box') hit = scan(n.children, n.id);
      else if (n.kind === 'list') hit = scan(n.item, n.id);
      if (hit) return hit;
    }
    return null;
  };
  return scan(d.children, null);
}

/** Content part ids a subtree shows (outside list item designs). */
function partsIn(nodes: readonly LayoutNode[]): string[] {
  const out: string[] = [];
  const visit = (list: readonly LayoutNode[]) => {
    for (const n of list) {
      if ('part' in n && typeof n.part === 'string') out.push(n.part);
      if (n.kind !== 'list') visit(childrenOf(n));
    }
  };
  visit(nodes);
  return out;
}

/** Remove a part with everything inside it; content only it showed goes too. A column is removed with its parts. */
export function removePart(data: FreeBlockData, id: string): FreeBlockData {
  const nextData = clone(data);
  const d = design(nextData);
  const row = rowFor(d, id);
  if (row && row.id !== id) {
    if (row.columns.length <= 1) return removePart(data, row.id);
    const col = row.columns.find((c) => c.id === id)!;
    row.columns = row.columns.filter((c) => c !== col);
    row.ratio = ratiosFor(row.columns.length)[0]!;
    dropUnplaced(nextData, partsIn(col.children), null);
    return nextData;
  }
  const where = locate(nextData, id);
  if (!where) return data;
  const target = containerOf(d, where.parent)!;
  const [node] = target.list.splice(where.index, 1);
  if (!node) return data;
  if (node.kind === 'list') {
    nextData.content.collections = nextData.content.collections.filter((c) => c.id !== node.collection);
  }
  dropUnplaced(nextData, partsIn([node]), target.listNode);
  return nextData;
}

/** Drop content parts that no design places any more. */
function dropUnplaced(data: FreeBlockData, ids: readonly string[], listNode: ListNode | null): void {
  if (!ids.length) return;
  const placed = new Set<string>();
  for (const d of data.designs) {
    walkNodes(d.children, (n, parents) => {
      const inList = parents.some((p) => p.kind === 'list');
      if (!('part' in n)) return;
      if (listNode ? inList : !inList) placed.add(n.part);
    });
  }
  const gone = new Set(ids.filter((i) => !placed.has(i)));
  if (listNode) {
    const c = data.content.collections.find((x) => x.id === listNode.collection);
    c?.items.forEach((item) => (item.parts = item.parts.filter((p) => !gone.has(p.id))));
  } else {
    data.content.parts = data.content.parts.filter((p) => !gone.has(p.id));
  }
}

/** Move a part one place up (-1) or down (+1) inside its container (Alt + arrow keys). */
export function movePartBy(data: FreeBlockData, id: string, delta: -1 | 1): FreeBlockData {
  const where = locate(data, id);
  if (!where) return data;
  const nextData = clone(data);
  const target = containerOf(design(nextData), where.parent)!;
  const to = where.index + delta;
  if (to < 0 || to >= target.list.length) return data;
  const [node] = target.list.splice(where.index, 1);
  target.list.splice(to, 0, node!);
  return nextData;
}

/**
 * Move a part to another place. Moving into itself, out of or into a list item design is
 * refused (content would change its home).
 */
export function movePart(data: FreeBlockData, id: string, to: Where): FreeBlockData {
  const from = locate(data, id);
  if (!from) return data;
  const d = activeDesign(data);
  const fromList = isInListItem(d.children, id);
  const node = findNode(d.children, id)!;
  if (to.parent !== null) {
    const toNode = findNode(d.children, to.parent);
    const toRow = rowFor(d, to.parent);
    const ownerId = toNode?.id ?? toRow?.id ?? null;
    if (ownerId === id || (ownerId && pathTo(d.children, ownerId)?.some((p) => p.id === id))) return data;
    const toList = toNode?.kind === 'list' ? toNode : ownerId ? isInListItem(d.children, ownerId) : null;
    if ((toList?.id ?? null) !== (fromList?.id ?? null)) return data;
  } else if (fromList) return data;
  const nextData = clone(data);
  const nd = design(nextData);
  const source = containerOf(nd, from.parent)!;
  const [moved] = source.list.splice(from.index, 1);
  const target = containerOf(nd, to.parent);
  if (!target || !moved) return data;
  let index = to.index;
  if (from.parent === to.parent && from.index < to.index) index -= 1;
  target.list.splice(Math.max(0, Math.min(index, target.list.length)), 0, moved);
  void node;
  return nextData;
}

type NodePatch = Partial<Omit<LayoutNode, 'id' | 'kind'>> & Record<string, unknown>;

/** Set design properties of a part; `undefined` clears one (inherit / default). */
export function setPartProps(data: FreeBlockData, id: string, patch: NodePatch): FreeBlockData {
  const nextData = clone(data);
  const node = findNode(design(nextData).children, id) as (LayoutNode & Record<string, unknown>) | null;
  if (!node) return data;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k === 'kind' || k === 'children' || k === 'columns' || k === 'item') continue;
    if (v === undefined) delete node[k];
    else node[k] = clone(v);
  }
  return nextData;
}

/** Number of columns of a row (1 to 4); removed columns hand their parts to the column before. */
export function setColumnCount(data: FreeBlockData, rowId: string, count: number): FreeBlockData {
  const n = Math.max(1, Math.min(4, Math.round(count)));
  const nextData = clone(data);
  const row = rowFor(design(nextData), rowId);
  if (!row || row.columns.length === n) return data;
  const next = idSource(nextData);
  while (row.columns.length < n) row.columns.push({ id: next('col'), children: [] });
  while (row.columns.length > n) {
    const gone = row.columns.pop()!;
    row.columns[row.columns.length - 1]!.children.push(...gone.children);
  }
  if (ratioParts(row.ratio).length !== n) row.ratio = ratiosFor(n)[0]!;
  return nextData;
}

export function setRatio(data: FreeBlockData, rowId: string, ratio: Ratio): FreeBlockData {
  const row = rowFor(activeDesign(data), rowId);
  if (!row || ratioParts(ratio).length !== row.columns.length) return data;
  return setPartProps(data, row.id, { ratio });
}

/** Set the block-wide look (font, base size, padding, alignment). */
export function setBlockStyle(data: FreeBlockData, patch: Partial<BlockStyle>): FreeBlockData {
  const nextData = clone(data);
  const d = design(nextData);
  const style = d.style as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete style[k];
    else style[k] = v;
  }
  return nextData;
}

type ContentPatch = Partial<Omit<ContentPart, 'id' | 'kind'>> & Record<string, unknown>;

/** Change a content part (words, addresses); `item` names the collection item for list content. */
export function setContent(data: FreeBlockData, partId: string, patch: ContentPatch, item?: { collection: string; item: string }): FreeBlockData {
  const nextData = clone(data);
  const list = item
    ? nextData.content.collections.find((c) => c.id === item.collection)?.items.find((i) => i.id === item.item)?.parts
    : nextData.content.parts;
  const part = list?.find((p) => p.id === partId) as (ContentPart & Record<string, unknown>) | undefined;
  if (!part) return data;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k === 'kind') continue;
    part[k] = clone(v);
  }
  return nextData;
}

/** Add an item to a collection after `after` (or at the end): a copy of that item with new ids. */
export function addListItem(data: FreeBlockData, collectionId: string, after?: string): FreeBlockData {
  const nextData = clone(data);
  const c = nextData.content.collections.find((x) => x.id === collectionId);
  if (!c?.items.length) return data;
  const index = after ? c.items.findIndex((i) => i.id === after) : c.items.length - 1;
  const source = c.items[index < 0 ? c.items.length - 1 : index]!;
  const next = idSource(nextData);
  c.items.splice((index < 0 ? c.items.length - 1 : index) + 1, 0, { id: next('it'), parts: clone(source.parts) });
  return nextData;
}

/** Remove an item; a list keeps at least one item. */
export function removeListItem(data: FreeBlockData, collectionId: string, itemId: string): FreeBlockData {
  const c = data.content.collections.find((x) => x.id === collectionId);
  if (!c || c.items.length <= 1 || !c.items.some((i) => i.id === itemId)) return data;
  const nextData = clone(data);
  const nc = nextData.content.collections.find((x) => x.id === collectionId)!;
  nc.items = nc.items.filter((i) => i.id !== itemId);
  return nextData;
}

export function moveListItem(data: FreeBlockData, collectionId: string, itemId: string, delta: -1 | 1): FreeBlockData {
  const nextData = clone(data);
  const c = nextData.content.collections.find((x) => x.id === collectionId);
  const i = c?.items.findIndex((x) => x.id === itemId) ?? -1;
  if (!c || i < 0 || i + delta < 0 || i + delta >= c.items.length) return data;
  const [item] = c.items.splice(i, 1);
  c.items.splice(i + delta, 0, item!);
  return nextData;
}

/** Quick starts of the empty block (mockup R1). */
export type QuickStart = 'twoColumns' | 'imageText' | 'textButton';

export function quickStart(data: FreeBlockData, which: QuickStart, texts: PartTexts = PART_TEXTS_EN): InsertResult {
  let r: InsertResult = { data, nodeId: null };
  const add = (kind: Exclude<InsertKind, 'column'>, parent: string | null, role?: TextRole) => {
    const target = parent === null ? activeDesign(r.data).children : null;
    const index = target ? target.length : (containerOf(activeDesign(r.data), parent)?.list.length ?? 0);
    r = insertPart(r.data, kind, { parent, index }, texts, role);
    return r.nodeId;
  };
  if (which === 'twoColumns') {
    const row = add('columns', null)!;
    const cols = (findNode(activeDesign(r.data).children, row) as ColumnsNode).columns.map((c) => c.id);
    add('image', cols[0]!);
    add('text', cols[1]!, 'headline');
    add('text', cols[1]!);
    add('button', cols[1]!);
    return { data: r.data, nodeId: row };
  }
  if (which === 'imageText') {
    const first = add('image', null);
    add('text', null, 'headline');
    add('text', null);
    return { data: r.data, nodeId: first };
  }
  const first = add('text', null, 'headline');
  add('text', null);
  add('button', null);
  return { data: r.data, nodeId: first };
}
