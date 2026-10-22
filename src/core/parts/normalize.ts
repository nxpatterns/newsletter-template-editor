import { isColorRole, parseHexColor, type SlotColor } from '../colors/model';
import { ensureRichDoc } from '../richtext/from-html';
import type { Block } from '../types';
import { FONT_PRESETS } from '../render/utils';
import {
  BUTTON_ROLES,
  BUTTON_VARIANTS,
  DIVIDER_LINES,
  IMAGE_ROLES,
  LIST_LAYOUTS,
  TEXT_ROLES,
  type BoxProps,
  type Collection,
  type ColumnNode,
  type ContentPart,
  type Design,
  type FreeBlockData,
  type LayoutNode,
  type TextStyle,
} from './model';
import { emptyFreeData } from './operations';
import {
  ALIGNS,
  BLEEDS,
  BORDER_SIDES,
  BORDER_WIDTHS,
  BUTTON_SIZES,
  ICON_SIZES,
  isOneOf,
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  RADII,
  RATIOS,
  ratioParts,
  ratiosFor,
  SPACES,
  TEXT_SIZES,
  VALIGNS,
  WEIGHTS,
  WIDTHS,
} from './scales';

/**
 * Stored or imported free block data made safe: unknown kinds, tokens and fields go, ids stay.
 * Never fails; the worst case is an empty block.
 */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const id = (v: unknown): string | null => (typeof v === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(v) ? v : null);

/** Normalizer for an embedded built-in block (from `normalize-newsletter.ts`, passed in to avoid a cycle). */
export type BlockNormalizer = (raw: unknown) => Block | null;

function pick<T extends string>(out: Json, raw: Json, key: string, list: readonly T[]): void {
  if (isOneOf(list, raw[key])) out[key] = raw[key];
}

function box(raw: Json): BoxProps {
  const out: Json = {};
  pick(out, raw, 'padV', SPACES);
  pick(out, raw, 'padH', SPACES);
  if (raw['bg'] === true) out['bg'] = true;
  pick(out, raw, 'border', BORDER_WIDTHS);
  pick(out, raw, 'borderSides', BORDER_SIDES);
  pick(out, raw, 'radius', RADII);
  pick(out, raw, 'align', ALIGNS);
  pick(out, raw, 'width', WIDTHS);
  return out as BoxProps;
}

const FONTS = [...Object.keys(FONT_PRESETS), 'custom'] as const;

function textStyle(raw: Json): TextStyle {
  const out: Json = {};
  pick(out, raw, 'font', FONTS);
  if (out['font'] === 'custom') out['customFont'] = str(raw['customFont']).slice(0, 200);
  pick(out, raw, 'size', TEXT_SIZES);
  pick(out, raw, 'weight', WEIGHTS);
  if (typeof raw['italic'] === 'boolean') out['italic'] = raw['italic'];
  if (typeof raw['uppercase'] === 'boolean') out['uppercase'] = raw['uppercase'];
  pick(out, raw, 'letterSpacing', LETTER_SPACINGS);
  pick(out, raw, 'lineHeight', LINE_HEIGHTS);
  return out as TextStyle;
}

function nodes(raw: unknown, seen: Set<string>): LayoutNode[] {
  if (!Array.isArray(raw)) return [];
  const out: LayoutNode[] = [];
  for (const r of raw) {
    const n = node(r, seen);
    if (n) out.push(n);
  }
  return out;
}

function node(raw: unknown, seen: Set<string>): LayoutNode | null {
  if (!isObj(raw)) return null;
  const nid = id(raw['id']);
  if (!nid || seen.has(nid)) return null;
  seen.add(nid);
  const base = { id: nid, ...box(raw) };
  const part = id(raw['part']);
  switch (raw['kind']) {
    case 'section':
      return { ...base, kind: 'section', ...(isOneOf(BLEEDS, raw['bleed']) ? { bleed: raw['bleed'] } : {}), children: nodes(raw['children'], seen) };
    case 'box':
      return { ...base, kind: 'box', children: nodes(raw['children'], seen) };
    case 'columns': {
      const columns: ColumnNode[] = [];
      for (const c of Array.isArray(raw['columns']) ? raw['columns'] : []) {
        const cid = isObj(c) ? id(c['id']) : null;
        if (!cid || seen.has(cid) || columns.length >= 4) continue;
        seen.add(cid);
        columns.push({ id: cid, children: nodes((c as Json)['children'], seen) });
      }
      if (!columns.length) return null;
      const ratio = isOneOf(RATIOS, raw['ratio']) && ratioParts(raw['ratio']).length === columns.length ? raw['ratio'] : ratiosFor(columns.length)[0]!;
      const out: Json = { ...base, kind: 'columns', ratio, columns };
      pick(out, raw, 'gap', SPACES);
      pick(out, raw, 'valign', VALIGNS);
      if (raw['stack'] === false) out['stack'] = false;
      if (raw['reversed'] === true) out['reversed'] = true;
      return out as unknown as LayoutNode;
    }
    case 'list': {
      const collection = id(raw['collection']);
      if (!collection) return null;
      const out: Json = { ...base, kind: 'list', collection, item: nodes(raw['item'], seen) };
      pick(out, raw, 'layout', LIST_LAYOUTS);
      pick(out, raw, 'gap', SPACES);
      return out as unknown as LayoutNode;
    }
    case 'text':
      return part ? { ...base, ...textStyle(raw), kind: 'text', part } : null;
    case 'image':
      return part ? { ...base, kind: 'image', part } : null;
    case 'button': {
      if (!part) return null;
      const out: Json = { ...base, kind: 'button', part };
      pick(out, raw, 'variant', BUTTON_VARIANTS);
      pick(out, raw, 'size', BUTTON_SIZES);
      if (raw['fullWidth'] === true) out['fullWidth'] = true;
      return out as unknown as LayoutNode;
    }
    case 'icon': {
      if (!part) return null;
      const out: Json = { ...base, kind: 'icon', part };
      pick(out, raw, 'size', ICON_SIZES);
      if (raw['circle'] === true) out['circle'] = true;
      return out as unknown as LayoutNode;
    }
    case 'divider': {
      const out: Json = { ...base, kind: 'divider' };
      pick(out, raw, 'line', DIVIDER_LINES);
      pick(out, raw, 'thickness', BORDER_WIDTHS.filter((w) => w !== '0'));
      return out as unknown as LayoutNode;
    }
    case 'spacer':
      return { ...base, kind: 'spacer', height: isOneOf(SPACES, raw['height']) ? raw['height'] : 'l' };
    case 'block':
      return part ? { ...base, kind: 'block', part } : null;
    default:
      return null;
  }
}

function slotColors(raw: unknown): Record<string, SlotColor> | undefined {
  if (!isObj(raw)) return undefined;
  const out: Record<string, SlotColor> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isObj(v)) continue;
    if (isColorRole(v['role'])) out[k] = { role: v['role'] };
    else {
      const hex = parseHexColor(v['hex']);
      if (hex) out[k] = { hex };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function contentPart(raw: unknown, normalizeBlock: BlockNormalizer): ContentPart | null {
  if (!isObj(raw)) return null;
  const pid = id(raw['id']);
  if (!pid) return null;
  switch (raw['kind']) {
    case 'text':
      return { id: pid, kind: 'text', role: isOneOf(TEXT_ROLES, raw['role']) ? raw['role'] : 'body', doc: ensureRichDoc(raw['doc']) };
    case 'image':
      return { id: pid, kind: 'image', role: isOneOf(IMAGE_ROLES, raw['role']) ? raw['role'] : 'image', src: str(raw['src']), alt: str(raw['alt']), href: str(raw['href']) };
    case 'button':
      return { id: pid, kind: 'button', role: isOneOf(BUTTON_ROLES, raw['role']) ? raw['role'] : 'cta', text: str(raw['text']), href: str(raw['href']) };
    case 'icon':
      return { id: pid, kind: 'icon', role: 'icon', glyph: [...str(raw['glyph'])].slice(0, 2).join('') };
    case 'block': {
      const block = normalizeBlock(raw['block']);
      if (!block) return null;
      const colors = slotColors(raw['colors']);
      return { id: pid, kind: 'block', role: 'block', block, ...(colors ? { colors } : {}) };
    }
    default:
      return null;
  }
}

function parts(raw: unknown, normalizeBlock: BlockNormalizer): ContentPart[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ContentPart[] = [];
  for (const r of raw) {
    const p = contentPart(r, normalizeBlock);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

function collections(raw: unknown, normalizeBlock: BlockNormalizer): Collection[] {
  if (!Array.isArray(raw)) return [];
  const out: Collection[] = [];
  for (const c of raw) {
    const cid = isObj(c) ? id(c['id']) : null;
    if (!cid || out.some((x) => x.id === cid)) continue;
    const items = (Array.isArray((c as Json)['items']) ? ((c as Json)['items'] as unknown[]) : [])
      .map((it) => (isObj(it) && id(it['id']) ? { id: id(it['id'])!, parts: parts(it['parts'], normalizeBlock).filter((p) => p.kind !== 'block') } : null))
      .filter((it): it is NonNullable<typeof it> => !!it);
    if (items.length) out.push({ id: cid, items });
  }
  return out;
}

function design(raw: unknown): Design | null {
  if (!isObj(raw)) return null;
  const did = id(raw['id']);
  if (!did) return null;
  const style: Json = isObj(raw['style']) ? { ...textStyle(raw['style']) } : {};
  if (isObj(raw['style'])) {
    pick(style, raw['style'], 'padV', SPACES);
    pick(style, raw['style'], 'padH', SPACES);
    pick(style, raw['style'], 'align', ALIGNS);
  }
  return { id: did, name: str(raw['name']).slice(0, 80), style, children: nodes(raw['children'], new Set()) };
}

export function normalizeFreeData(raw: unknown, normalizeBlock: BlockNormalizer): FreeBlockData {
  if (!isObj(raw)) return emptyFreeData();
  const content = isObj(raw['content']) ? raw['content'] : {};
  const designs = (Array.isArray(raw['designs']) ? raw['designs'] : []).map(design).filter((d): d is Design => !!d);
  if (!designs.length) return { ...emptyFreeData(), content: { parts: parts(content['parts'], normalizeBlock), collections: collections(content['collections'], normalizeBlock) } };
  const active = designs.some((d) => d.id === raw['active']) ? (raw['active'] as string) : designs[0]!.id;
  return {
    content: { parts: parts(content['parts'], normalizeBlock), collections: collections(content['collections'], normalizeBlock) },
    designs,
    active,
  };
}
