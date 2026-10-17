/** Anything inside the preview that belongs to a block or its chrome (select, drag, edit, delete). */
const BLOCK_OR_CHROME = 'tr[data-block-id], .nte-drag-handle, .nte-edit-btn, .nte-delete-btn';

/**
 * True when a click inside the preview document hit the empty surface around the blocks
 * (page background, outer presentation table, gutters). Such a click clears the selection.
 */
export function isPreviewBackdropClick(target: Element | null): boolean {
  return !!target?.closest && !target.closest(BLOCK_OR_CHROME);
}
