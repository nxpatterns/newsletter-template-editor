import type { Block } from '../../../core';
import { CATALOG_TYPES } from '../../editor/blocks/block-catalog';

/** Host ↔ iframe drag payload for catalog block types (not text/plain). */
export const NTE_CATALOG_MIME = 'application/x-nte-catalog-type';

/** Preview reorder payload (not text/plain — avoids address-bar leaks). */
export const NTE_BLOCK_ID_MIME = 'application/x-nte-block-id';

const CATALOG_TYPE_SET = new Set<string>(CATALOG_TYPES);

export function isCatalogBlockType(value: string | null | undefined): value is Block['type'] {
  return !!value && CATALOG_TYPE_SET.has(value);
}

/** Index to insert a new block relative to a target row. */
export function insertIndexForDrop(
  orderedIds: readonly string[],
  targetId: string,
  place: 'before' | 'after',
): number {
  const target = orderedIds.indexOf(targetId);
  if (target < 0) return orderedIds.length;
  return place === 'before' ? target : target + 1;
}

export type DropResolve =
  | { mode: 'between'; blockId: string; place: 'before' | 'after' }
  | { mode: 'append' };

export interface DropBlockRect {
  id: string;
  top: number;
  bottom: number;
  height: number;
}

/**
 * Stable drop zones (no hit-test flicker):
 * - Pointer inside the 600px presentation column (`table.email-container`) →
 *   always resolve the nearest block row by Y ("insert here").
 * - Pointer outside that column (gutters, body, chrome) → append at end.
 *
 * Do not use event.target.closest('tr.nte-block'): nested tables and the gap
 * opened by transform shifts make that oscillate with tiny mouse moves.
 */
export function resolveDropAtPoint(
  clientX: number,
  clientY: number,
  container: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'> | null,
  blocks: ReadonlyArray<DropBlockRect>,
): DropResolve {
  if (!container || blocks.length === 0) return { mode: 'append' };

  const insideX = clientX >= container.left && clientX <= container.right;
  const insideY = clientY >= container.top && clientY <= container.bottom;
  if (!insideX || !insideY) return { mode: 'append' };

  let best = blocks[0]!;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const b of blocks) {
    let dist: number;
    if (clientY < b.top) dist = b.top - clientY;
    else if (clientY > b.bottom) dist = clientY - b.bottom;
    else dist = 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }

  const mid = best.top + best.height / 2;
  const place: 'before' | 'after' = clientY < mid ? 'before' : 'after';
  return { mode: 'between', blockId: best.id, place };
}
