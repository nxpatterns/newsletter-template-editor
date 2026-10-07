import type { Block } from '../../../core';
import { CATALOG_TYPES } from '../../editor/blocks/block-catalog';

/** Host ↔ iframe drag payload for catalog block types. */
export const NTE_CATALOG_MIME = 'application/x-nte-catalog-type';

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
