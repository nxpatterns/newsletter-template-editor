/** Compute a new block-id order after dropping source relative to target. */
export function reorderBlockIds(
  orderedIds: readonly string[],
  sourceId: string,
  targetId: string,
  place: 'before' | 'after',
): string[] | null {
  if (sourceId === targetId) return null;
  const ids = [...orderedIds];
  const from = ids.indexOf(sourceId);
  const target = ids.indexOf(targetId);
  if (from < 0 || target < 0) return null;

  ids.splice(from, 1);
  const nextTarget = ids.indexOf(targetId);
  if (nextTarget < 0) return null;
  const insertAt = place === 'before' ? nextTarget : nextTarget + 1;
  ids.splice(insertAt, 0, sourceId);

  const unchanged = ids.length === orderedIds.length && ids.every((id, i) => id === orderedIds[i]);
  return unchanged ? null : ids;
}

/** Decide insert side from pointer Y within a block row. */
export function dropPlaceFromY(clientY: number, rowTop: number, rowHeight: number): 'before' | 'after' {
  const mid = rowTop + rowHeight / 2;
  return clientY < mid ? 'before' : 'after';
}
