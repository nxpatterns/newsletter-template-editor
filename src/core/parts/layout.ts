import { EMAIL_CONTENT_WIDTH_PX } from '../render/utils';
import type { Block } from '../types';
import { activeDesign, findNode, pathTo, type FreeBlockData, type LayoutNode, type PartKind } from './model';
import type { InsertKind, Where } from './operations';
import { columnWidths, ICON_CIRCLE_PAD_PX, innerPx, sharePx, topLevelPx } from './render';
import { ICON_PX } from './scales';

/**
 * Resolved widths and the floors of decision 82: widths are px at the 600 px canvas, the phone
 * is 320 px. Starting values, to be checked in practice.
 */

export const PHONE_WIDTH_PX = 320;
/** A column that does not stack must keep at least this at phone width (decision 77). */
export const PHONE_COLUMN_MIN_PX = 120;

export const MIN_WIDTH_PX: Readonly<Record<Exclude<PartKind, 'icon' | 'image'>, number>> & { image: number; contentImage: number } = {
  section: 0,
  box: 0,
  columns: 0,
  list: 0,
  text: 120,
  button: 120,
  divider: 0,
  spacer: 0,
  block: 280,
  image: 48,
  contentImage: 120,
};

/** Columns inside columns at most once; own blocks inside own blocks at most 3 levels deep. */
export const MAX_COLUMN_DEPTH = 2;
export const MAX_OWN_DEPTH = 3;

/** Width in px each node gets (its cell), at a block width. */
export function resolvedWidths(data: FreeBlockData, widthPx = EMAIL_CONTENT_WIDTH_PX): Map<string, number> {
  const d = activeDesign(data);
  const out = new Map<string, number>();
  const visit = (nodes: readonly LayoutNode[], avail: number) => {
    for (const n of nodes) {
      const px = sharePx(avail, n);
      out.set(n.id, px);
      const inner = innerPx(px, n);
      if (n.kind === 'section' || n.kind === 'box') visit(n.children, inner);
      if (n.kind === 'columns') {
        const widths = columnWidths(inner, n);
        n.columns.forEach((c, i) => {
          out.set(c.id, widths[i] ?? 0);
          visit(c.children, widths[i] ?? 0);
        });
      }
      if (n.kind === 'list') {
        const per = n.layout === 'grid3' ? 3 : n.layout === 'grid2' ? 2 : 1;
        const w = per === 1 ? inner : (columnWidths(inner, { ratio: per === 3 ? '1:1:1' : '1:1', gap: n.gap ?? 'm', columns: Array.from({ length: per }, () => ({ id: '', children: [] })) })[0] ?? 0);
        visit(n.item, w);
      }
    }
  };
  for (const n of d.children) visit([n], topLevelPx(widthPx, d.style, n));
  return out;
}

/** Smallest width a part may get; icons need their size plus padding. */
export function minWidthOf(n: LayoutNode, contentRole?: string): number {
  if (n.kind === 'icon') {
    const icon = ICON_PX[n.size ?? 'm'];
    return n.circle ? icon + 2 * ICON_CIRCLE_PAD_PX : icon;
  }
  if (n.kind === 'image') return contentRole === 'logo' ? MIN_WIDTH_PX.image : MIN_WIDTH_PX.contentImage;
  return MIN_WIDTH_PX[n.kind];
}

const MIN_BY_INSERT: Partial<Record<InsertKind, number>> = {
  text: MIN_WIDTH_PX.text,
  button: MIN_WIDTH_PX.button,
  image: MIN_WIDTH_PX.contentImage,
  icon: ICON_PX.m,
};

/** Width a new part would get at a place. */
export function widthAt(data: FreeBlockData, where: Where, widthPx = EMAIL_CONTENT_WIDTH_PX): number {
  const d = activeDesign(data);
  if (where.parent === null) {
    const style = d.style;
    return topLevelPx(widthPx, style, { id: '', kind: 'spacer', height: '0' });
  }
  const widths = resolvedWidths(data, widthPx);
  const own = widths.get(where.parent);
  if (own === undefined) return widthPx;
  const node = findNode(d.children, where.parent);
  return node ? innerPx(own, node) : own;
}

/** Number of rows (columns parts) a place sits in. */
function columnDepth(data: FreeBlockData, where: Where): number {
  if (where.parent === null) return 0;
  const d = activeDesign(data);
  const owner = findNode(d.children, where.parent);
  let path = owner ? [...(pathTo(d.children, owner.id) ?? []), owner] : null;
  if (!owner) {
    // A column id: its row and the row's ancestors.
    let row: LayoutNode | null = null;
    const scan = (nodes: readonly LayoutNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'columns' && n.columns.some((c) => c.id === where.parent)) row = n;
        if (n.kind === 'columns') n.columns.forEach((c) => scan(c.children));
        if (n.kind === 'section' || n.kind === 'box') scan(n.children);
        if (n.kind === 'list') scan(n.item);
      }
    };
    scan(d.children);
    if (row) path = [...(pathTo(d.children, (row as LayoutNode).id) ?? []), row];
  }
  return (path ?? []).filter((n) => n.kind === 'columns').length;
}

/** How deep own blocks nest inside an embedded block (1 = an own block without own blocks inside). */
export function ownDepth(block: Block): number {
  if (block.type !== 'free') return block.own ? 1 : 0;
  let inner = 0;
  for (const p of block.content.parts) if (p.kind === 'block') inner = Math.max(inner, ownDepth(p.block));
  return (block.own ? 1 : 0) + inner;
}

export type RefuseReason = 'tooNarrow' | 'columnsDepth' | 'ownDepth' | 'fourColumns' | 'notInList';

export interface Refusal {
  reason: RefuseReason;
  /** px the part would get, and the floor. */
  width?: number;
  min?: number;
}

/** Why a part cannot go to a place (decision 82: width floors refuse the drop), or null. */
export function refuseInsert(data: FreeBlockData, kind: InsertKind | 'block', where: Where, opts: { embedded?: Block } = {}): Refusal | null {
  if (kind === 'columns' && columnDepth(data, where) >= MAX_COLUMN_DEPTH) return { reason: 'columnsDepth' };
  const d = activeDesign(data);
  if (kind === 'block' && opts.embedded && where.parent !== null) {
    const inList = findNode(d.children, where.parent)?.kind === 'list' || pathTo(d.children, where.parent)?.some((p) => p.kind === 'list');
    if (inList) return { reason: 'notInList' };
  }
  if (kind === 'block' && opts.embedded && ownDepth(opts.embedded) >= MAX_OWN_DEPTH) return { reason: 'ownDepth' };
  const width = widthAt(data, where);
  const min = kind === 'block' ? MIN_WIDTH_PX.block : kind === 'column' ? 0 : (MIN_BY_INSERT[kind] ?? 0);
  if (min && width < min) return { reason: 'tooNarrow', width, min };
  return null;
}

/** Floors of a share change (width list, column ratio): the narrowest leaf it would leave. */
export function narrowestLeaf(data: FreeBlockData, widthPx = EMAIL_CONTENT_WIDTH_PX): { id: string; width: number; min: number } | null {
  const widths = resolvedWidths(data, widthPx);
  const roles = new Map(data.content.parts.map((p) => [p.id, p.role as string]));
  let worst: { id: string; width: number; min: number } | null = null;
  const visit = (nodes: readonly LayoutNode[]) => {
    for (const n of nodes) {
      const min = minWidthOf(n, 'part' in n ? roles.get(n.part) : undefined);
      const w = widths.get(n.id) ?? 0;
      if (min && w < min && (!worst || w - min < worst.width - worst.min)) worst = { id: n.id, width: w, min };
      if (n.kind === 'columns') n.columns.forEach((c) => visit(c.children));
      if (n.kind === 'section' || n.kind === 'box') visit(n.children);
      if (n.kind === 'list') visit(n.item);
    }
  };
  visit(activeDesign(data).children);
  return worst;
}

/** Non-stacking columns narrower than about 120 px on a 320 px phone (decision 77). */
export function narrowPhoneColumns(data: FreeBlockData): string[] {
  const out: string[] = [];
  const widths = resolvedWidths(data, PHONE_WIDTH_PX);
  const visit = (nodes: readonly LayoutNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'columns') {
        if (n.stack === false && n.columns.some((c) => (widths.get(c.id) ?? 0) < PHONE_COLUMN_MIN_PX)) out.push(n.id);
        n.columns.forEach((c) => visit(c.children));
      }
      if (n.kind === 'section' || n.kind === 'box') visit(n.children);
      if (n.kind === 'list') visit(n.item);
    }
  };
  visit(activeDesign(data).children);
  return out;
}

