import { COLOR_MODES, type ColorMode } from '../colors/model';
import { slotContrastIssue } from '../colors/edit';
import { colorSlotsOf } from '../colors/slots';
import type { Block, Newsletter } from '../types';

/**
 * Quality checks of one block in its document, in plain findings the UI words. Used by the block
 * editor today and meant for the newsletter checks too. Findings warn; they never block saving.
 */
export type BlockFinding =
  /** A text color is hard to read on its surface in one color set. */
  | { kind: 'contrast'; mode: ColorMode; slot: string; onSlot: string; fg: string; bg: string; ratio: number; min: number }
  /** An image without a description (shown when images are blocked, read by screen readers). */
  | { kind: 'missingAlt'; field: string; item?: number }
  /** Link text that does not say where the click goes, e.g. "click here". */
  | { kind: 'vagueLink'; field: string; text: string; item?: number };

/** Link texts that say nothing about the target (compared trimmed, lower case, without end marks). */
const VAGUE_LINK_TEXTS = new Set([
  'hier',
  'hier klicken',
  'klicken sie hier',
  'klick hier',
  'mehr',
  'link',
  'click here',
  'click',
  'here',
  'more',
]);

export function isVagueLinkText(text: string): boolean {
  return VAGUE_LINK_TEXTS.has(text.trim().toLowerCase().replace(/[.!:…»›→]+$/u, '').trim());
}

const filled = (s: string | undefined) => !!s && !!s.trim();

/** Image fields of a block: description missing while an image is set. */
function altFindings(block: Block): BlockFinding[] {
  switch (block.type) {
    case 'image':
    case 'image-text':
    case 'contact':
    case 'video':
      return filled(block.src) && !filled(block.alt) ? [{ kind: 'missingAlt', field: 'alt' }] : [];
    case 'testimonial':
      return block.imageMode !== 'none' && filled(block.src) && !filled(block.alt) ? [{ kind: 'missingAlt', field: 'alt' }] : [];
    case 'teasers':
      return block.items.flatMap((it, item): BlockFinding[] =>
        filled(it.src) && !filled(it.alt) ? [{ kind: 'missingAlt', field: 'alt', item }] : [],
      );
    default:
      return [];
  }
}

function linkFindings(block: Block): BlockFinding[] {
  const vague = (field: string, text: string, item?: number): BlockFinding[] =>
    isVagueLinkText(text) ? [{ kind: 'vagueLink', field, text: text.trim(), ...(item === undefined ? {} : { item }) }] : [];
  switch (block.type) {
    case 'cta-button':
      return vague('text', block.text);
    case 'contact':
      return vague('buttonLabel', block.buttonLabel);
    case 'event':
      return vague('buttonLabel', block.buttonLabel);
    case 'cta-link-list':
      return block.items.flatMap((it, i) => vague('linkText', it.linkText, i));
    case 'teasers':
      return block.items.flatMap((it, i) => vague('linkText', it.linkText, i));
    default:
      return [];
  }
}

/** Every finding of one block, contrast in Light and Dark first. */
export function blockFindings(n: Newsletter, blockId: string): BlockFinding[] {
  const block = n.blocks.find((b) => b.id === blockId);
  if (!block) return [];
  const target = { id: block.id, type: block.type };
  const contrast: BlockFinding[] = [];
  for (const mode of COLOR_MODES) {
    for (const def of colorSlotsOf(block.type)) {
      const issue = slotContrastIssue(n.globals.colors, mode, target, def.key);
      if (issue) {
        contrast.push({ kind: 'contrast', mode, slot: def.key, onSlot: issue.onKey, fg: issue.fg, bg: issue.bg, ratio: issue.ratio, min: issue.min });
      }
    }
  }
  return [...contrast, ...altFindings(block), ...linkFindings(block)];
}
