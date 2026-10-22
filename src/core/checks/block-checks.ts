import { COLOR_MODES, type ColorMode } from '../colors/model';
import { slotContrastIssue } from '../colors/edit';
import { slotsOf } from '../colors/slots';
import type { Block, FreeBlock, Newsletter } from '../types';
import { colorTargetOf } from '../parts/colors';
import { freeFindings } from '../parts/checks';

/**
 * Quality checks of one block in its document, in plain findings the UI words. Used by the block
 * editor today and meant for the newsletter checks too. Findings warn; they never block saving.
 */
export type BlockFinding =
  /** A text color is hard to read on its surface in one color set. */
  | { kind: 'contrast'; mode: ColorMode; slot: string; onSlot: string; fg: string; bg: string; ratio: number; min: number }
  /** An image without a description (shown when images are blocked, read by screen readers). */
  | { kind: 'missingAlt'; field: string; item?: number; part?: string }
  /** Link text that does not say where the click goes, e.g. "click here". */
  | { kind: 'vagueLink'; field: string; text: string; item?: number; part?: string }
  | FreeFinding;

/** Findings only free blocks have; `part` is the part to select (decisions 41, 77, 82). */
export type FreeFinding =
  /** Text smaller than its floor: body text 14 px, small print 12 px. */
  | { kind: 'smallText'; part: string; px: number; min: number }
  /** Body text with tight line height. */
  | { kind: 'tightText'; part: string }
  /** Button lower than 44 px (WCAG 2.2 target size). */
  | { kind: 'tapTarget'; part: string; px: number; min: number }
  /** A part narrower than its floor; breaks in classic Outlook. */
  | { kind: 'tooNarrow'; part: string; px: number; min: number }
  /** Columns that keep side by side on phones get narrower than about 120 px. */
  | { kind: 'narrowOnPhone'; part: string }
  /** A content part that no design places and is not hidden: content would be lost. */
  | { kind: 'notPlaced'; content: string }
  /** SVG image: Gmail and classic Outlook do not show it. */
  | { kind: 'svgImage'; part: string }
  /** The first font of a custom stack is no system font; Gmail and Outlook show the fallback. */
  | { kind: 'webFont'; part: string | null; font: string };

export { isVagueLinkText } from './link-text';
import { isVagueLinkText } from './link-text';

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
  const target = colorTargetOf(block);
  const contrast: BlockFinding[] = [];
  for (const mode of COLOR_MODES) {
    for (const def of slotsOf(target)) {
      const issue = slotContrastIssue(n.globals.colors, mode, target, def.key);
      if (issue) {
        contrast.push({ kind: 'contrast', mode, slot: def.key, onSlot: issue.onKey, fg: issue.fg, bg: issue.bg, ratio: issue.ratio, min: issue.min });
      }
    }
  }
  if (block.type === 'free') return [...contrast, ...freeFindings(block as FreeBlock)];
  return [...contrast, ...altFindings(block), ...linkFindings(block)];
}
