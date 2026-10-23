import { slotsOf } from '../colors/slots';
import { resolveSlot, type ColorTarget } from '../colors/edit';
import { buildLinkHref, detectLinkKind } from '../richtext/link-target';
import { renderInlines } from '../richtext/to-html';
import { nameRendering } from '../render/names';
import type { Block, FreeBlock } from '../types';
import type { RenderContext } from '../render/blocks';
import { attrHref, escapeAttr, escapeHtml, resolveHref, EMAIL_CONTENT_WIDTH_PX } from '../render/utils';
import { colorTargetOf, FREE_ROOT_CLASS, nodeClass } from './colors';
import { embeddedAs, withEmbedColors } from './embed';
import {
  activeDesign,
  type BlockStyle,
  type BoxProps,
  type ButtonNode,
  type CollectionItem,
  type ColumnsNode,
  type ContentPart,
  type DividerNode,
  type EmbedNode,
  type IconNode,
  type ImageNode,
  type LayoutNode,
  type ListNode,
  type TextNode,
  type TextRole,
} from './model';
import {
  BORDER_PX,
  BUTTON_SIZE,
  ICON_PX,
  ratioParts,
  SPACE_PX,
  WIDTH_SHARE,
  type LineHeight,
  type Space,
  type TextSize,
} from './scales';

/**
 * The one shared renderer for free blocks (decision 13): a tree of parts becomes nested
 * presentation tables with classes, px widths from the available width (decision 76) and
 * `bgcolor` dual-writes. Styles come from `css.ts`; the export inliner bakes them in.
 * Classic Outlook keeps columns side by side; other clients stack them below 600 px.
 */

/** Default padding of a free block: the content inset of the built-in blocks (24 / 48 px). */
export const FREE_DEFAULT_PAD_V: Space = 'l';
export const FREE_DEFAULT_PAD_H: Space = '2xl';

type EmbedRenderer = (block: Block, ctx: RenderContext) => string;

interface Scope {
  ctx: RenderContext;
  block: FreeBlock;
  target: ColorTarget;
  style: BlockStyle;
  parts: Map<string, ContentPart>;
  /** Item of a collection while its item design renders. */
  item: CollectionItem | null;
  embed: EmbedRenderer;
}

const TABLE = 'role="presentation" cellspacing="0" cellpadding="0" border="0"';

/** Resolved px width of a share of the available width. */
export function sharePx(avail: number, n: Pick<BoxProps, 'width'>): number {
  return Math.max(0, Math.round(avail * WIDTH_SHARE[n.width ?? 'full']));
}

/** Width left inside a part's padding and border. */
export function innerPx(px: number, n: BoxProps): number {
  const pad = 2 * SPACE_PX[n.padH ?? '0'];
  const sides = n.borderSides ?? 'all';
  const border = n.border && (sides === 'all' || sides === 'y' || sides === 'left') ? BORDER_PX[n.border] * (sides === 'all' ? 2 : 1) : 0;
  return Math.max(0, px - pad - (sides === 'y' ? 0 : border));
}

/** Column widths for a ratio: shares of the width left after the gaps; the rest goes to the last. */
export function columnWidths(avail: number, n: Pick<ColumnsNode, 'ratio' | 'gap' | 'columns'>): number[] {
  const shares = ratioParts(n.ratio).slice(0, n.columns.length);
  const gap = SPACE_PX[n.gap ?? 'm'];
  const free = Math.max(0, avail - gap * Math.max(0, shares.length - 1));
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  const widths = shares.map((s) => Math.floor((free * s) / total));
  const used = widths.reduce((a, b) => a + b, 0);
  if (widths.length) widths[widths.length - 1]! += free - used;
  return widths;
}

/** Available width of the block's top-level parts: the block width minus its side padding, or all of it for a full bleed section. */
export function topLevelPx(width: number, style: BlockStyle, n: LayoutNode): number {
  if (n.kind === 'section' && n.bleed === 'full') return width;
  return Math.max(0, width - 2 * SPACE_PX[style.padH ?? FREE_DEFAULT_PAD_H]);
}

function hex(scope: Scope, key: string): string {
  return escapeAttr(resolveSlot(scope.ctx.globals.colors, scope.ctx.globals.colors.mode, scope.target, key).hex);
}

function hasSlot(scope: Scope, key: string): boolean {
  return slotsOf(scope.target).some((s) => s.key === key);
}

/** Classes of the box properties of a part. */
function boxClasses(n: BoxProps): string[] {
  const out: string[] = [];
  if (n.padV && n.padV !== '0') out.push(`fp-pv-${n.padV}`);
  if (n.padH && n.padH !== '0') out.push(`fp-ph-${n.padH}`);
  if (n.border && n.border !== '0') out.push(`fp-bd-${n.border}-${n.borderSides ?? 'all'}`);
  if (n.radius && n.radius !== 'none') out.push(`fp-r-${n.radius}`);
  if (n.align) out.push(`fp-a-${n.align}`);
  return out;
}

function partAttrs(scope: Scope, n: LayoutNode): string {
  if (!scope.ctx.parts) return '';
  const sel = scope.ctx.parts.selected === n.id ? ' data-part-selected="true"' : '';
  return ` data-part="${escapeAttr(n.id)}" data-part-kind="${n.kind}"${sel}`;
}

/** One part as a table cell: box classes, background and the part's content. */
function cell(scope: Scope, n: LayoutNode, avail: number): string {
  const px = n.kind === 'image' ? avail : sharePx(avail, n);
  const classes = ['fp-node', nodeClass(n.id), ...boxClasses(n)];
  const bg = n.bg && hasSlot(scope, `${n.id}.bg`) ? ` bgcolor="${hex(scope, `${n.id}.bg`)}"` : '';
  const align = n.align ? ` align="${n.align}"` : '';
  const inner = renderNode(scope, n, innerPx(px, n));
  const td = `<td class="${classes.join(' ')}"${bg}${align}${partAttrs(scope, n)}>${inner}</td>`;
  if (px >= avail) return td;
  // A narrower part sits in a table of its own px width, placed by the part's alignment.
  const place = n.align ?? 'left';
  return `<td align="${place}" class="fp-place"><table ${TABLE} width="${px}" align="${place}" class="fp-w"><tr>${td}</tr></table></td>`;
}

/** Parts one below the other. */
function stack(scope: Scope, nodes: readonly LayoutNode[], avail: number): string {
  if (!nodes.length) return '';
  return `<table ${TABLE} width="100%" class="fp-stack">${nodes.map((n) => `<tr>${cell(scope, n, avail)}</tr>`).join('')}</table>`;
}

function contentOf(scope: Scope, part: string): ContentPart | undefined {
  if (scope.item) return scope.item.parts.find((p) => p.id === part);
  return scope.parts.get(part);
}

function renderNode(scope: Scope, n: LayoutNode, avail: number): string {
  switch (n.kind) {
    case 'section':
    case 'box':
      return stack(scope, n.children, avail);
    case 'columns':
      return renderColumns(scope, n, avail);
    case 'list':
      return renderList(scope, n, avail);
    case 'text':
      return renderText(scope, n);
    case 'image':
      return renderImage(scope, n, avail);
    case 'button':
      return renderButton(scope, n);
    case 'icon':
      return renderIcon(scope, n);
    case 'divider':
      return renderDivider(n, avail);
    case 'spacer': {
      const h = SPACE_PX[n.height];
      return `<table ${TABLE} width="100%"><tr><td class="fp-spacer fp-h-${n.height}" height="${h}">&nbsp;</td></tr></table>`;
    }
    case 'block':
      return renderEmbed(scope, n, avail);
  }
}

/** Side by side; stacked below 600 px unless the part says no (decision 77). */
function renderColumns(scope: Scope, n: ColumnsNode, avail: number): string {
  const widths = columnWidths(avail, n);
  const gap = SPACE_PX[n.gap ?? 'm'];
  const stacks = n.stack !== false;
  const valign = n.valign ?? 'top';
  const cols = n.columns.map((c, i) => ({ c, w: widths[i] ?? 0 }));
  // Reversed stacking: the source runs backwards and `dir="rtl"` shows it forwards on wide screens.
  const rtl = stacks && !!n.reversed;
  if (rtl) cols.reverse();
  const cells = cols.map(({ c, w }, i) => {
    const cls = ['fp-col', stacks ? 'fp-col-s' : '', stacks && i > 0 ? `fp-cn-${n.gap ?? 'm'}` : ''].filter(Boolean).join(' ');
    const part = scope.ctx.parts ? ` data-column="${escapeAttr(c.id)}"` : '';
    const col = `<td class="${cls}" width="${w}" valign="${valign}"${rtl ? ' dir="ltr"' : ''}${part}>${stack(scope, c.children, w)}</td>`;
    const gapCell = i < cols.length - 1 && gap ? `<td class="fp-gap${stacks ? ' fp-gap-s' : ''}" width="${gap}">&nbsp;</td>` : '';
    return col + gapCell;
  });
  return `<table ${TABLE} width="100%" class="fp-cols"${rtl ? ' dir="rtl"' : ''}><tr>${cells.join('')}</tr></table>`;
}

/** A collection: every item in the one item design; stacked or a grid that stacks on phones. */
function renderList(scope: Scope, n: ListNode, avail: number): string {
  const collection = scope.block.content.collections.find((c) => c.id === n.collection);
  const items = collection?.items ?? [];
  if (!items.length) return '';
  const per = n.layout === 'grid3' ? 3 : n.layout === 'grid2' ? 2 : 1;
  const gap = n.gap ?? 'm';
  const gapPx = SPACE_PX[gap];
  const one = (item: CollectionItem, w: number) => stack({ ...scope, item }, n.item, w);
  if (per === 1) {
    const rows = items.map((item, i) => {
      const spacer = i > 0 && gapPx ? `<tr><td class="fp-spacer fp-h-${gap}" height="${gapPx}">&nbsp;</td></tr>` : '';
      return `${spacer}<tr><td class="fp-item">${one(item, avail)}</td></tr>`;
    });
    return `<table ${TABLE} width="100%" class="fp-list">${rows.join('')}</table>`;
  }
  const widths = columnWidths(avail, { ratio: per === 3 ? '1:1:1' : '1:1', gap, columns: Array.from({ length: per }, () => ({ id: '', children: [] })) });
  const rows: string[] = [];
  for (let start = 0; start < items.length; start += per) {
    const cells = Array.from({ length: per }, (_, i) => {
      const item = items[start + i];
      const w = widths[i] ?? 0;
      const cls = ['fp-col', 'fp-col-s', i > 0 ? `fp-cn-${gap}` : ''].filter(Boolean).join(' ');
      const body = item ? one(item, w) : '&nbsp;';
      const gapCell = i < per - 1 && gapPx ? `<td class="fp-gap fp-gap-s" width="${gapPx}">&nbsp;</td>` : '';
      return `<td class="${cls}" width="${w}" valign="top">${body}</td>${gapCell}`;
    });
    const spacer = start > 0 && gapPx ? `<tr><td class="fp-spacer fp-h-${gap}" height="${gapPx}">&nbsp;</td></tr>` : '';
    rows.push(`${spacer}<tr><td><table ${TABLE} width="100%" class="fp-cols"><tr>${cells.join('')}</tr></table></td></tr>`);
  }
  return `<table ${TABLE} width="100%" class="fp-list">${rows.join('')}</table>`;
}

/** Headline roles get heading tags (screen readers, later blog and Markdown targets). */
const HEADING_TAG: Partial<Record<TextRole, string>> = { headline: 'h2', subline: 'h3' };

/** Resolved text look: the part, else the block design, else the template (decision 42). */
export function resolvedText(style: BlockStyle, n: TextNode): { size: TextSize; lineHeight: LineHeight } & TextNode {
  return {
    ...n,
    font: n.font ?? style.font,
    customFont: n.font ? n.customFont : style.customFont,
    size: n.size ?? style.size ?? 'm',
    weight: n.weight ?? style.weight,
    italic: n.italic ?? style.italic,
    uppercase: n.uppercase ?? style.uppercase,
    letterSpacing: n.letterSpacing ?? style.letterSpacing,
    lineHeight: n.lineHeight ?? style.lineHeight ?? 'normal',
  };
}

function textClasses(t: ReturnType<typeof resolvedText>): string {
  const out = ['fp-p', `fp-t-${t.size}-${t.lineHeight}`];
  out.push(t.font && t.font !== 'custom' ? `fp-f-${t.font}` : t.font === 'custom' ? 'fp-f-custom' : 'fp-f-tpl');
  out.push(t.weight === 'bold' ? 'fp-bold' : 'fp-regular');
  if (t.italic) out.push('fp-italic');
  if (t.uppercase) out.push('fp-upper');
  if (t.letterSpacing && t.letterSpacing !== 'none') out.push(`fp-ls-${t.letterSpacing}`);
  return out.join(' ');
}

function renderText(scope: Scope, n: TextNode): string {
  const part = contentOf(scope, n.part);
  if (!part || part.kind !== 'text') return scope.ctx.annotate ? '&nbsp;' : '';
  const t = resolvedText(scope.style, n);
  const tag = HEADING_TAG[part.role] ?? 'p';
  const cls = textClasses(t);
  const names = nameRendering(scope.ctx);
  return part.doc
    .map((p) => {
      let inner = renderInlines(p.children, { names });
      // A paragraph color sits on a span: the text slot rule on `.fp-p` would win over a class there.
      if (inner && p.color) inner = `<span class="text-${p.color}">${inner}</span>`;
      return `<${tag} class="${cls}">${inner || '<br>'}</${tag}>`;
    })
    .join('');
}

function linkFor(href: string): string {
  const raw = href.trim();
  if (!raw) return '';
  return buildLinkHref(detectLinkKind(raw) ?? 'web', raw) ?? '';
}

function renderImage(scope: Scope, n: ImageNode, avail: number): string {
  const part = contentOf(scope, n.part);
  const src = part?.kind === 'image' ? part.src.trim() : '';
  if (!src && !scope.ctx.annotate) return '';
  const w = sharePx(avail, n);
  const radius = n.radius && n.radius !== 'none' ? ` fp-r-${n.radius}` : '';
  const alt = part?.kind === 'image' ? part.alt : '';
  let pic = src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" width="${w}" class="fp-img${radius}">`
    : `<span class="nte-image-empty" style="--image-w:${w}px">&nbsp;</span>`;
  const href = part?.kind === 'image' ? linkFor(part.href) : '';
  if (src && href) pic = `<a href="${attrHref(resolveHref(href, scope.ctx.mode), scope.ctx.mode)}" target="_blank" class="fp-img-link">${pic}</a>`;
  return pic;
}

function renderButton(scope: Scope, n: ButtonNode): string {
  const part = contentOf(scope, n.part);
  if (!part || part.kind !== 'button' || !part.text.trim()) return scope.ctx.annotate ? '&nbsp;' : '';
  const href = resolveHref(linkFor(part.href), scope.ctx.mode);
  const variant = n.variant ?? 'filled';
  const size = n.size ?? 'm';
  const text = escapeHtml(part.text);
  const link = `<a href="${attrHref(href, scope.ctx.mode)}" target="_blank" class="fp-btn-link fp-btn-t-${BUTTON_SIZE[size].text}">${text}</a>`;
  if (variant === 'text') return link;
  const radius = n.radius && n.radius !== 'none' ? ` fp-r-${n.radius}` : '';
  const fill = variant === 'filled' ? ` bgcolor="${hex(scope, `${n.id}.fill`)}"` : '';
  const align = n.align ?? 'left';
  const width = n.fullWidth ? ' width="100%"' : '';
  return `<table ${TABLE}${width} align="${align}" class="fp-btn"><tr><td class="fp-btn-cell fp-btn-${size} fp-btn-${variant}${radius}" align="center"${fill}>${link}</td></tr></table>`;
}

/** Circle diameter around an icon: the icon plus 8 px each side. */
export const ICON_CIRCLE_PAD_PX = 8;

function renderIcon(scope: Scope, n: IconNode): string {
  const part = contentOf(scope, n.part);
  const glyph = part?.kind === 'icon' ? part.glyph : '';
  if (!glyph) return scope.ctx.annotate ? '&nbsp;' : '';
  const size = n.size ?? 'm';
  const px = ICON_PX[size];
  const icon = `<span class="fp-icon fp-icon-${size}">${escapeHtml(glyph)}</span>`;
  if (!n.circle) return icon;
  const d = px + 2 * ICON_CIRCLE_PAD_PX;
  return `<table ${TABLE} align="${n.align ?? 'left'}" class="fp-icon-wrap"><tr><td class="fp-icon-cell fp-r-round" width="${d}" height="${d}" align="center" valign="middle" bgcolor="${hex(scope, `${n.id}.circle`)}">${icon}</td></tr></table>`;
}

function renderDivider(n: DividerNode, avail: number): string {
  const w = sharePx(avail, n);
  return `<table ${TABLE} width="${w}" align="${n.align ?? 'center'}"><tr><td class="fp-divider fp-dv-${n.line ?? 'solid'}-${n.thickness ?? '1'}">&nbsp;</td></tr></table>`;
}

function renderEmbed(scope: Scope, n: EmbedNode, avail: number): string {
  const part = contentOf(scope, n.part);
  if (!part || part.kind !== 'block') return '';
  const { block, colors } = embeddedAs(scope.block.id, n.id, part);
  const globals = withEmbedColors(scope.ctx.globals, block.id, colors);
  const rows = scope.embed(block, { ...scope.ctx, globals, annotate: false, parts: undefined, widthPx: avail, target: colorTargetOf(block) });
  return `<table ${TABLE} width="100%" class="fp-embed">${rows}</table>`;
}

/** The block as one row of the email container. */
export function renderFreeBlock(block: FreeBlock, ctx: RenderContext, embed: EmbedRenderer): string {
  const design = activeDesign(block);
  const style = design.style;
  const target = ctx.target?.slots ? ctx.target : colorTargetOf(block);
  const scope: Scope = {
    ctx,
    block,
    target,
    style,
    parts: new Map(block.content.parts.map((p) => [p.id, p])),
    item: null,
    embed,
  };
  const width = ctx.widthPx ?? EMAIL_CONTENT_WIDTH_PX;
  const padH = style.padH ?? FREE_DEFAULT_PAD_H;
  const padV = style.padV ?? FREE_DEFAULT_PAD_V;
  const rows = design.children.map((n) => {
    const avail = topLevelPx(width, style, n);
    const gutter = avail === width ? 'fp-bleed' : `fp-gutter fp-ph-${padH} mobile-padding`;
    return `<tr><td class="${gutter}">${stack(scope, [n], avail)}</td></tr>`;
  });
  const empty = !rows.length && ctx.annotate ? `<tr><td class="fp-gutter fp-ph-${padH}">${ctx.parts?.empty ?? '&nbsp;'}</td></tr>` : '';
  const align = style.align ? ` fp-a-${style.align}` : '';
  const scopeClass = `cb-${block.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const inner = `<td bgcolor="${hex(scope, 'background')}" class="${FREE_ROOT_CLASS} fp-pv-${padV}${align}"${ctx.parts ? ' data-part="root"' : ''}><table ${TABLE} width="100%">${rows.join('') || empty}</table></td>`;
  if (!ctx.annotate) return `<tr class="${scopeClass}">${inner}</tr>`;
  return `<tr class="nte-block ${scopeClass}" data-block-id="${escapeAttr(block.id)}" data-block-type="free">${inner}</tr>`;
}

/** Every part id the design places (leaves outside list item designs). */
export function placedPartIds(nodes: readonly LayoutNode[]): Set<string> {
  const out = new Set<string>();
  const visit = (list: readonly LayoutNode[]) => {
    for (const n of list) {
      if (n.kind === 'list') continue;
      if ('part' in n && typeof n.part === 'string') out.add(n.part);
      if (n.kind === 'columns') n.columns.forEach((c) => visit(c.children));
      if (n.kind === 'section' || n.kind === 'box') visit(n.children);
    }
  };
  visit(nodes);
  return out;
}
