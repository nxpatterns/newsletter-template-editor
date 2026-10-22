import type { BlockFinding } from '../checks/block-checks';
import { isVagueLinkText } from '../checks/link-text';
import type { FreeBlock } from '../types';
import { narrowestLeaf, narrowPhoneColumns } from './layout';
import { activeDesign, walkNodes, type ContentPart, type TextNode, type TextRole } from './model';
import { placedPartIds, resolvedText } from './render';
import { BUTTON_SIZE, lineHeightPx, TEXT_SIZE_PX } from './scales';

/**
 * Checks of a free block beyond contrast (decision 82). They warn and never block saving; the
 * width floors are refused when a part is dropped, these catch what changed afterwards.
 */

/** Small print may go down to 12 px; everything else needs 14 px. */
const SMALL_PRINT: ReadonlySet<TextRole> = new Set(['small', 'badge', 'label']);
export const BODY_MIN_PX = TEXT_SIZE_PX.s;
export const SMALL_MIN_PX = TEXT_SIZE_PX.xs;
/** WCAG 2.2 target size for buttons. */
export const TAP_MIN_PX = 44;

/** System fonts that need no web font (first entry of a custom stack). */
const SYSTEM_FONTS = new Set(
  ['arial', 'helvetica', 'georgia', 'times', 'times new roman', 'verdana', 'tahoma', 'trebuchet ms', 'palatino', 'palatino linotype', 'book antiqua', 'courier', 'courier new', 'lucida sans unicode', 'lucida grande', 'arial narrow', 'segoe ui', 'calibri', 'cambria', 'garamond', 'sans-serif', 'serif', 'monospace'],
);

export function firstFont(stack: string): string {
  return (stack.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

const isSvg = (src: string) => /^data:image\/svg/i.test(src.trim()) || /\.svg(\?|#|$)/i.test(src.trim());

export function freeFindings(block: FreeBlock): BlockFinding[] {
  const design = activeDesign(block);
  const out: BlockFinding[] = [];
  const parts = new Map(block.content.parts.map((p) => [p.id, p]));
  const itemParts = new Map<string, ContentPart[]>();
  for (const c of block.content.collections) itemParts.set(c.id, c.items.flatMap((i) => i.parts));
  const seen = new Set<string>();
  const once = (f: BlockFinding, key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };

  if (design.style.font === 'custom' && design.style.customFont && !SYSTEM_FONTS.has(firstFont(design.style.customFont).toLowerCase())) {
    out.push({ kind: 'webFont', part: null, font: firstFont(design.style.customFont) });
  }

  walkNodes(design.children, (n, parents) => {
    const list = [...parents].reverse().find((p) => p.kind === 'list');
    const contents: ContentPart[] =
      'part' in n ? (list?.kind === 'list' ? (itemParts.get(list.collection) ?? []).filter((p) => p.id === n.part) : [parts.get(n.part)].filter((p): p is ContentPart => !!p)) : [];
    for (const c of contents) {
      if (n.kind === 'text' && c.kind === 'text') {
        const t = resolvedText(design.style, n as TextNode);
        const min = SMALL_PRINT.has(c.role) ? SMALL_MIN_PX : BODY_MIN_PX;
        if (TEXT_SIZE_PX[t.size] < min) once({ kind: 'smallText', part: n.id, px: TEXT_SIZE_PX[t.size], min }, `small-${n.id}`);
        if (c.role === 'body' && t.lineHeight === 'tight') once({ kind: 'tightText', part: n.id }, `tight-${n.id}`);
        if (t.font === 'custom' && t.customFont && !SYSTEM_FONTS.has(firstFont(t.customFont).toLowerCase())) {
          once({ kind: 'webFont', part: n.id, font: firstFont(t.customFont) }, `font-${n.id}`);
        }
      }
      if (n.kind === 'image' && c.kind === 'image' && c.src.trim()) {
        if (!c.alt.trim()) once({ kind: 'missingAlt', field: 'alt', part: n.id }, `alt-${n.id}`);
        if (isSvg(c.src)) once({ kind: 'svgImage', part: n.id }, `svg-${n.id}`);
      }
      if (n.kind === 'button' && c.kind === 'button') {
        if (isVagueLinkText(c.text)) once({ kind: 'vagueLink', field: 'text', text: c.text.trim(), part: n.id }, `link-${n.id}`);
        const size = BUTTON_SIZE[n.size ?? 'm'];
        const h = lineHeightPx(size.text, 'tight') + (n.variant === 'text' ? 0 : 2 * size.padV);
        if (h < TAP_MIN_PX) once({ kind: 'tapTarget', part: n.id, px: h, min: TAP_MIN_PX }, `tap-${n.id}`);
      }
    }
  });

  const narrow = narrowestLeaf(block);
  if (narrow) out.push({ kind: 'tooNarrow', part: narrow.id, px: narrow.width, min: narrow.min });
  for (const id of narrowPhoneColumns(block)) out.push({ kind: 'narrowOnPhone', part: id });

  // Nothing lost (decision 41): every content part is placed by some design.
  const placed = new Set<string>();
  for (const d of block.designs) placedPartIds(d.children).forEach((id) => placed.add(id));
  for (const p of block.content.parts) if (!placed.has(p.id)) out.push({ kind: 'notPlaced', content: p.id });
  return out;
}
