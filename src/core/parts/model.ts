import type { SlotColor } from '../colors/model';
import type { RichDoc } from '../richtext/model';
import type { Block, FontFamilyPreset } from '../types';
import type {
  Align,
  Bleed,
  BorderSides,
  BorderWidth,
  ButtonSize,
  IconSize,
  LetterSpacing,
  LineHeight,
  Radius,
  Ratio,
  Space,
  TextSize,
  Valign,
  Weight,
  WidthShare,
} from './scales';

/**
 * Parts model of free blocks (decisions 40 to 47, 75 to 82). A free block has one content and
 * one or more designs:
 * - content: flat content parts plus collections; only words, addresses and the embedded block.
 * - design: a layout tree that places content parts by id and holds every style as a token.
 * Colors are color slots of the block (`colors.ts`), set like the colors of a clone.
 */

/** What a text says it is; drives the default look, headline semantics and the size floors. */
export const TEXT_ROLES = ['headline', 'subline', 'body', 'label', 'badge', 'price', 'name', 'quote', 'small'] as const;
export type TextRole = (typeof TEXT_ROLES)[number];

export const IMAGE_ROLES = ['image', 'photo', 'logo'] as const;
export type ImageRole = (typeof IMAGE_ROLES)[number];

export const BUTTON_ROLES = ['cta', 'link'] as const;
export type ButtonRole = (typeof BUTTON_ROLES)[number];

export interface TextContent {
  id: string;
  kind: 'text';
  role: TextRole;
  doc: RichDoc;
}

export interface ImageContent {
  id: string;
  kind: 'image';
  role: ImageRole;
  src: string;
  alt: string;
  /** Optional link target as typed (web, mail or phone). */
  href: string;
}

export interface ButtonContent {
  id: string;
  kind: 'button';
  role: ButtonRole;
  text: string;
  /** Link target as typed: web page, email address or phone number. */
  href: string;
}

export interface IconContent {
  id: string;
  kind: 'icon';
  role: 'icon';
  /** One glyph from the email-safe set. */
  glyph: string;
}

/**
 * An embedded block, one opaque content part: a built-in block (the event until a Date part
 * exists) or an own block, which records its version in `block.own` (decision 38).
 */
export interface EmbedContent {
  id: string;
  kind: 'block';
  role: 'block';
  block: Block;
  /** The embedded own block's colors (roles or fixed), as a placed block keeps them. */
  colors?: Record<string, SlotColor>;
}

export type ContentPart = TextContent | ImageContent | ButtonContent | IconContent | EmbedContent;
export type ContentKind = ContentPart['kind'];

/** One entry of a collection: its parts keyed by role (decision 75). */
export interface CollectionItem {
  id: string;
  parts: ContentPart[];
}

export interface Collection {
  id: string;
  items: CollectionItem[];
}

export interface FreeContent {
  parts: ContentPart[];
  collections: Collection[];
}

/** Box properties every part has; absent = default (no padding, no background, no border, full width). */
export interface BoxProps {
  padV?: Space;
  padH?: Space;
  /** Has a background; its color is the slot `<id>.bg`. */
  bg?: boolean;
  border?: BorderWidth;
  borderSides?: BorderSides;
  radius?: Radius;
  align?: Align;
  width?: WidthShare;
}

export type FontChoice = Exclude<FontFamilyPreset, 'Custom'> | 'custom';

/** Text look; unset means inherit from the block design (decision 42). */
export interface TextStyle {
  font?: FontChoice;
  customFont?: string;
  size?: TextSize;
  weight?: Weight;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: LetterSpacing;
  lineHeight?: LineHeight;
}

interface NodeBase extends BoxProps {
  id: string;
}

export interface SectionNode extends NodeBase {
  kind: 'section';
  /** Full canvas (a band) or the content width (decision 78). */
  bleed?: Bleed;
  children: LayoutNode[];
}

export interface BoxNode extends NodeBase {
  kind: 'box';
  children: LayoutNode[];
}

export interface ColumnNode {
  id: string;
  children: LayoutNode[];
}

export interface ColumnsNode extends NodeBase {
  kind: 'columns';
  ratio: Ratio;
  gap?: Space;
  valign?: Valign;
  /** Stack on phones (decision 77), default yes. */
  stack?: boolean;
  /** Stacked order: natural or reversed only. */
  reversed?: boolean;
  columns: ColumnNode[];
}

export const LIST_LAYOUTS = ['stack', 'grid2', 'grid3'] as const;
export type ListLayout = (typeof LIST_LAYOUTS)[number];

/** Places a whole collection; `item` is the one item design, its leaves name roles, not ids. */
export interface ListNode extends NodeBase {
  kind: 'list';
  collection: string;
  layout?: ListLayout;
  gap?: Space;
  item: LayoutNode[];
}

export interface TextNode extends NodeBase, TextStyle {
  kind: 'text';
  /** Content part id; inside a list item design: the role. */
  part: string;
}

export interface ImageNode extends NodeBase {
  kind: 'image';
  part: string;
}

export const BUTTON_VARIANTS = ['filled', 'outline', 'text'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export interface ButtonNode extends NodeBase {
  kind: 'button';
  part: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export interface IconNode extends NodeBase {
  kind: 'icon';
  part: string;
  size?: IconSize;
  circle?: boolean;
}

export const DIVIDER_LINES = ['solid', 'dashed', 'dotted'] as const;
export type DividerLine = (typeof DIVIDER_LINES)[number];

export interface DividerNode extends NodeBase {
  kind: 'divider';
  line?: DividerLine;
  thickness?: Exclude<BorderWidth, '0'>;
}

export interface SpacerNode extends NodeBase {
  kind: 'spacer';
  height: Space;
}

export interface EmbedNode extends NodeBase {
  kind: 'block';
  part: string;
}

export type LayoutNode =
  | SectionNode
  | BoxNode
  | ColumnsNode
  | ListNode
  | TextNode
  | ImageNode
  | ButtonNode
  | IconNode
  | DividerNode
  | SpacerNode
  | EmbedNode;
export type PartKind = LayoutNode['kind'];

/** Parts that hold other parts. */
export const CONTAINER_KINDS: readonly PartKind[] = ['section', 'box', 'columns', 'list'];
/** Parts that show a content part. */
export const LEAF_CONTENT_KINDS: readonly PartKind[] = ['text', 'image', 'button', 'icon', 'block'];

/** Look of the whole block: the defaults its parts inherit, and the block's own padding. */
export interface BlockStyle extends TextStyle {
  padV?: Space;
  padH?: Space;
  align?: Align;
}

export interface Design {
  id: string;
  name: string;
  style: BlockStyle;
  children: LayoutNode[];
}

/** A free block as placed in a template; the same shape is stored in own block versions. */
export interface FreeBlockData {
  content: FreeContent;
  /** One or more designs over the same content (decision 46); the UI shows the active one. */
  designs: Design[];
  active: string;
}

export const isContainer = (n: LayoutNode): n is SectionNode | BoxNode | ColumnsNode | ListNode =>
  n.kind === 'section' || n.kind === 'box' || n.kind === 'columns' || n.kind === 'list';

export const hasPart = (n: LayoutNode): n is TextNode | ImageNode | ButtonNode | IconNode | EmbedNode =>
  n.kind === 'text' || n.kind === 'image' || n.kind === 'button' || n.kind === 'icon' || n.kind === 'block';

/** The design that is shown. */
export function activeDesign(data: FreeBlockData): Design {
  return data.designs.find((d) => d.id === data.active) ?? data.designs[0]!;
}

/** Direct children of a node; columns give the children of all their columns. */
export function childrenOf(n: LayoutNode): LayoutNode[] {
  if (n.kind === 'columns') return n.columns.flatMap((c) => c.children);
  if (n.kind === 'list') return n.item;
  if (n.kind === 'section' || n.kind === 'box') return n.children;
  return [];
}

/** Every node of a tree, depth first. */
export function walkNodes(nodes: readonly LayoutNode[], visit: (n: LayoutNode, parents: readonly LayoutNode[]) => void, parents: readonly LayoutNode[] = []): void {
  for (const n of nodes) {
    visit(n, parents);
    walkNodes(childrenOf(n), visit, [...parents, n]);
  }
}

export function findNode(nodes: readonly LayoutNode[], id: string): LayoutNode | null {
  let hit: LayoutNode | null = null;
  walkNodes(nodes, (n) => {
    if (!hit && n.id === id) hit = n;
  });
  return hit;
}

/** Ancestors of a node, outermost first; null when it is not in the tree. */
export function pathTo(nodes: readonly LayoutNode[], id: string): LayoutNode[] | null {
  let hit: LayoutNode[] | null = null;
  walkNodes(nodes, (n, parents) => {
    if (!hit && n.id === id) hit = [...parents];
  });
  return hit;
}

/** True inside the item design of a list, where leaves name roles of the collection's items. */
export function isInListItem(nodes: readonly LayoutNode[], id: string): ListNode | null {
  const path = pathTo(nodes, id);
  if (!path) return null;
  for (let i = path.length - 1; i >= 0; i--) {
    const p = path[i]!;
    if (p.kind === 'list') return p;
  }
  return null;
}
