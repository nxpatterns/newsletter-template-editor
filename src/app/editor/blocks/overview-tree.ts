import {
  isFramePartShown,
  REQUIRED_FRAME_PARTS,
  richDocPlainText,
  type Block,
  type FramePart,
  type Globals,
} from '../../../core';
import type { EditorPanelTab } from '../newsletter-session.service';

/** One step of an "edit it here" route: an i18n key, optionally with the group number shown in the tab. */
export interface RouteStep {
  key: string;
  n?: number;
}

/** Element in another panel tab the overview can jump to; `groupId` opens a closed group accordion first. */
export interface JumpTarget {
  tab: EditorPanelTab;
  testId: string;
  groupId?: string;
}

interface FramePartInfo {
  labelKey: string;
  glyph: string;
  route: RouteStep[];
  target: JumpTarget;
}

const BRAND: RouteStep = { key: 'panel.tab.brand' };
const LEGAL: RouteStep = { key: 'panel.tab.legal' };
const SENDER: RouteStep = { key: 'legal.groupSender' };
const LINKS: RouteStep = { key: 'legal.groupLinks' };

/** Where each header/footer part is edited: tab, numbered group or section, element to jump to. */
export const FRAME_PART_INFO: Record<FramePart, FramePartInfo> = {
  starsTop: {
    labelKey: 'brand.stars',
    glyph: '★',
    route: [BRAND, { key: 'brand.stars', n: 1 }, { key: 'frame.top' }],
    target: { tab: 'brand', testId: 'brand-stars', groupId: 'stars' },
  },
  brandName: {
    labelKey: 'brand.name',
    glyph: 'A',
    route: [BRAND, { key: 'brand.name', n: 2 }],
    target: { tab: 'brand', testId: 'brand-name', groupId: 'name' },
  },
  logo: {
    labelKey: 'brand.logoSection',
    glyph: '◎',
    route: [BRAND, { key: 'brand.logoSection', n: 3 }],
    target: { tab: 'brand', testId: 'logo-block', groupId: 'logo' },
  },
  viewInBrowserTop: {
    labelKey: 'legal.viewInBrowserGroup',
    glyph: '↗',
    route: [BRAND, { key: 'legal.viewInBrowserGroup', n: 4 }],
    target: { tab: 'brand', testId: 'brand-view-in-browser', groupId: 'view-in-browser' },
  },
  notice: {
    labelKey: 'legal.notice',
    glyph: 'i',
    route: [LEGAL, SENDER],
    target: { tab: 'legal', testId: 'legal-notice' },
  },
  social: {
    labelKey: 'legal.socialTitle',
    glyph: '@',
    route: [{ key: 'panel.tab.social.full' }],
    target: { tab: 'social', testId: 'social-fields' },
  },
  starsBottom: {
    labelKey: 'brand.stars',
    glyph: '★',
    route: [BRAND, { key: 'brand.stars', n: 1 }, { key: 'frame.bottom' }],
    target: { tab: 'brand', testId: 'brand-stars', groupId: 'stars' },
  },
  company: {
    labelKey: 'legal.companyRow',
    glyph: '⌂',
    route: [LEGAL, SENDER],
    target: { tab: 'legal', testId: 'legal-company' },
  },
  privacy: {
    labelKey: 'frame.part.privacy',
    glyph: '§',
    route: [LEGAL, LINKS],
    target: { tab: 'legal', testId: 'legal-links' },
  },
  imprint: {
    labelKey: 'frame.part.imprint',
    glyph: '§',
    route: [LEGAL, LINKS],
    target: { tab: 'legal', testId: 'legal-links' },
  },
  unsubscribe: {
    labelKey: 'frame.part.unsubscribe',
    glyph: '✉',
    route: [LEGAL, LINKS],
    target: { tab: 'legal', testId: 'legal-links' },
  },
  viewInBrowserBottom: {
    labelKey: 'legal.viewInBrowserGroup',
    glyph: '↗',
    route: [LEGAL, LINKS],
    target: { tab: 'legal', testId: 'legal-links' },
  },
};

/** Header parts in mail order (stars and brand name left, logo and link right). */
export const OVERVIEW_HEAD: readonly FramePart[] = [
  'starsTop',
  'brandName',
  'logo',
  'viewInBrowserTop',
];
/** Footer parts in mail order; the four links follow as their own branch. */
export const OVERVIEW_FOOT: readonly FramePart[] = ['notice', 'social', 'starsBottom', 'company'];
export const OVERVIEW_LINKS: readonly FramePart[] = [
  'privacy',
  'imprint',
  'unsubscribe',
  'viewInBrowserBottom',
];

export type OverviewGroupId = 'head' | 'body' | 'foot';

export interface OverviewPart {
  kind: 'part';
  id: string;
  part: FramePart;
  shown: boolean;
  /** Switched off although the law requires it (imprint, unsubscribe). */
  missing: boolean;
}

export interface OverviewBlock {
  kind: 'block';
  id: string;
  block: Block;
  /** 1-based position in the mail. */
  position: number;
  snippet: string;
  /** Blocks that follow a chapter block, up to the next chapter. */
  children: OverviewBlock[];
}

export interface OverviewLinks {
  kind: 'links';
  id: 'links';
  children: OverviewPart[];
}

export type OverviewChild = OverviewPart | OverviewBlock | OverviewLinks;

export interface OverviewGroup {
  kind: 'group';
  id: OverviewGroupId;
  /** Tabs where this group is edited, in the order a user would look. */
  tabs: EditorPanelTab[];
  children: OverviewChild[];
}

export type OverviewNode = OverviewGroup | OverviewChild;

/** Longest snippet in characters; longer text ends at a word with an ellipsis. */
export const SNIPPET_MAX = 60;

/** Short text that tells two blocks of the same type apart. */
export function blockSnippet(block: Block): string {
  const raw = ((): string => {
    switch (block.type) {
      case 'hero':
        return block.headline;
      case 'paragraph':
        return richDocPlainText(block.body);
      case 'image-text':
        return richDocPlainText(block.body) || block.alt;
      case 'cta-button':
        return block.text;
      case 'chapter-band':
        return block.title;
      case 'pull-quote':
      case 'testimonial':
        return block.quote;
      case 'stat-box':
        return `${block.number} ${block.label}`;
      case 'benefits-list':
        return block.items[0]?.text ?? '';
      case 'price-box':
        return `${block.amount} ${block.currency}`;
      case 'cta-link-list':
        return block.items.map((i) => i.linkText).join(', ');
      case 'image':
        return block.caption || block.alt;
      case 'greeting':
        return block.text;
      case 'contact':
        return block.name;
      case 'video':
      case 'event':
        return block.title;
      case 'teasers':
        return block.items[0]?.title ?? '';
      case 'divider':
        return '';
    }
  })();
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length <= SNIPPET_MAX) return text;
  const cut = text.slice(0, SNIPPET_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > SNIPPET_MAX / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, '')}…`;
}

function partNode(globals: Globals, part: FramePart): OverviewPart {
  const shown = isFramePartShown(globals, part);
  return {
    kind: 'part',
    id: `part-${part}`,
    part,
    shown,
    missing: !shown && REQUIRED_FRAME_PARTS.includes(part),
  };
}

function bodyChildren(blocks: readonly Block[]): OverviewBlock[] {
  const out: OverviewBlock[] = [];
  let chapter: OverviewBlock | null = null;
  blocks.forEach((block, i) => {
    const node: OverviewBlock = {
      kind: 'block',
      id: block.id,
      block,
      position: i + 1,
      snippet: blockSnippet(block),
      children: [],
    };
    if (block.type === 'chapter-band') {
      chapter = node;
      out.push(node);
    } else {
      (chapter ? chapter.children : out).push(node);
    }
  });
  return out;
}

/** Read-only overview of a newsletter: header parts, blocks grouped by chapter, footer parts. */
export function buildOverview(blocks: readonly Block[], globals: Globals): OverviewGroup[] {
  return [
    {
      kind: 'group',
      id: 'head',
      tabs: ['brand'],
      children: OVERVIEW_HEAD.map((p) => partNode(globals, p)),
    },
    { kind: 'group', id: 'body', tabs: ['placed'], children: bodyChildren(blocks) },
    {
      kind: 'group',
      id: 'foot',
      tabs: ['legal', 'social', 'brand'],
      children: [
        ...OVERVIEW_FOOT.map((p) => partNode(globals, p)),
        { kind: 'links', id: 'links', children: OVERVIEW_LINKS.map((p) => partNode(globals, p)) },
      ],
    },
  ];
}

/** Number of leaves under a node (a leaf counts as one). */
export function leafCount(node: OverviewNode): number {
  if (node.kind === 'part') return 1;
  if (node.kind === 'block' && node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + leafCount(c), node.kind === 'block' ? 1 : 0);
}

/** Leaves that show in the mail (a hidden part counts zero). */
export function shownLeafCount(node: OverviewNode): number {
  if (node.kind === 'part') return node.shown ? 1 : 0;
  if (node.kind === 'block' && node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + shownLeafCount(c), node.kind === 'block' ? 1 : 0);
}

/** True when a required part is switched off somewhere under this node. */
export function hasMissing(node: OverviewNode): boolean {
  if (node.kind === 'part') return node.missing;
  if (node.kind === 'block') return false;
  return node.children.some(hasMissing);
}
