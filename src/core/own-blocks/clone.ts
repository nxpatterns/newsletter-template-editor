import {
  COLOR_MODES,
  defaultColors,
  isColorRole,
  normalizeColors,
  parseHexColor,
  type ColorsConfig,
  type SlotColor,
} from '../colors/model';
import { colorSlotsOf } from '../colors/slots';
import { normalizeNewsletter } from '../persist/normalize-newsletter';
import { CURRENT_SCHEMA_VERSION, type Block, type Globals, type Newsletter, type OwnBlockRef } from '../types';

/**
 * Clone mode of the block editor (decision 31): an own copy of a built-in block. The structure
 * stays the one of the original type; the starting texts, the type's layout options and the
 * colors (as roles or fixed) can change. Every function here is pure.
 */

/** Id of the one block in a clone's working document. */
export const CLONE_BLOCK_ID = 'clone';

export interface CloneContent {
  kind: 'clone';
  /** The block as new copies of it start: starting texts and layout options of the built-in type. */
  block: Block;
  /**
   * Colors set in the copy, one choice for Light and Dark (decision 51): a role follows the
   * template the block is used in, a fixed value stays (decision 35). Absent = the type's default role.
   */
  colors: Record<string, SlotColor>;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function isCloneContent(v: unknown): v is CloneContent {
  return isObj(v) && v['kind'] === 'clone' && isObj(v['block']) && typeof v['block']['type'] === 'string';
}

/** A fresh copy of a built-in block: its fields as given, its colors as the type's defaults. */
export function newCloneContent(block: Block): CloneContent {
  return { kind: 'clone', block: { ...structuredClone(block), id: CLONE_BLOCK_ID }, colors: {} };
}

/** Colors of the copy that the type knows, each a known role or a valid hex. */
function cleanColors(type: string, raw: unknown): Record<string, SlotColor> {
  if (!isObj(raw)) return {};
  const keys = new Set(colorSlotsOf(type).map((s) => s.key));
  const out: Record<string, SlotColor> = {};
  for (const [key, v] of Object.entries(raw)) {
    if (!keys.has(key) || !isObj(v)) continue;
    if (isColorRole(v['role'])) out[key] = { role: v['role'] };
    else {
      const hex = parseHexColor(v['hex']);
      if (hex) out[key] = { hex };
    }
  }
  return out;
}

/** Stored or imported clone content made safe to use; null when it is not a clone. */
export function normalizeCloneContent(raw: unknown): CloneContent | null {
  if (!isCloneContent(raw)) return null;
  const doc = normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: undefined as unknown as Globals,
    blocks: [{ ...(raw.block as Block), id: CLONE_BLOCK_ID }],
  });
  const block = doc.blocks[0];
  if (!block) return null;
  delete block.own;
  return { kind: 'clone', block, colors: cleanColors(block.type, raw.colors) };
}

/**
 * What the block editor edits: a document with only the copy, in the colors of the template it
 * was opened from (or the neutral standard colors). The copy's colors sit on the block level of
 * both sets, exactly where a placed block keeps its own colors, so preview, fields and checks
 * work as in the editor.
 */
export function cloneWorkDocument(content: CloneContent, base: Globals): Newsletter {
  const colors: ColorsConfig = { ...defaultColors(), mode: base.colors.mode };
  for (const mode of COLOR_MODES) {
    colors[mode] = {
      general: { ...base.colors[mode].general },
      blocks: Object.keys(content.colors).length ? { [CLONE_BLOCK_ID]: { ...content.colors } } : {},
    };
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: { ...base, colors },
    blocks: [{ ...structuredClone(content.block), id: CLONE_BLOCK_ID }],
  };
}

/** The clone content held by a working document. */
export function cloneContentOf(doc: Newsletter): CloneContent {
  const block = doc.blocks[0];
  const colors = doc.globals.colors[doc.globals.colors.mode].blocks[CLONE_BLOCK_ID] ?? {};
  return { kind: 'clone', block: { ...structuredClone(block), id: CLONE_BLOCK_ID }, colors: { ...colors } };
}

/** Set one color of the copy in Light and Dark; null goes back to the type's default role. */
export function setCloneColor(colors: ColorsConfig, key: string, value: SlotColor | null): ColorsConfig {
  let clean: SlotColor | null = null;
  if (value && 'role' in value && isColorRole(value.role)) clean = { role: value.role };
  else if (value && 'hex' in value) {
    const hex = parseHexColor(value.hex);
    if (!hex) return colors;
    clean = { hex };
  }
  const next: ColorsConfig = { ...colors };
  for (const mode of COLOR_MODES) {
    const { [key]: _old, ...rest } = colors[mode].blocks[CLONE_BLOCK_ID] ?? {};
    const slots = clean ? { ...rest, [key]: clean } : rest;
    const { [CLONE_BLOCK_ID]: _block, ...others } = colors[mode].blocks;
    next[mode] = { ...colors[mode], blocks: Object.keys(slots).length ? { ...others, [CLONE_BLOCK_ID]: slots } : others };
  }
  return next;
}

/**
 * Fields of each type that are layout options, not texts or images. They come from the copy when
 * placed blocks are replaced by it; everything else stays as the user wrote it there.
 */
export const LAYOUT_FIELDS: Readonly<Partial<Record<Block['type'], readonly string[]>>> = {
  divider: ['style', 'background', 'heightPx'],
  greeting: ['useName', 'size', 'color'],
  image: ['width'],
  'image-text': ['side', 'imageWidth', 'valign'],
  testimonial: ['imageMode'],
  teasers: ['columns'],
  event: ['locationMode', 'calendar'],
  'price-box': ['currency', 'strikeEnabled'],
};

/** Write the copy's colors as the block's own colors in both sets (a role follows the template). */
function withOwnColors(colors: ColorsConfig, id: string, slots: Record<string, SlotColor>): ColorsConfig {
  const next: ColorsConfig = { ...colors };
  for (const mode of COLOR_MODES) {
    const { [id]: _old, ...others } = colors[mode].blocks;
    next[mode] = { ...colors[mode], blocks: Object.keys(slots).length ? { ...others, [id]: { ...slots } } : others };
  }
  return next;
}

/** Insert an own block into a template at `index`; the inserted block records its version (decision 2). */
export function placeOwnBlock(
  n: Newsletter,
  input: { content: CloneContent; ref: OwnBlockRef; id: string; index: number },
): Newsletter {
  const block = { ...structuredClone(input.content.block), id: input.id, own: { ...input.ref } } as Block;
  const blocks = [...n.blocks];
  blocks.splice(Math.max(0, Math.min(input.index, blocks.length)), 0, block);
  return {
    ...n,
    globals: { ...n.globals, colors: withOwnColors(n.globals.colors, input.id, input.content.colors) },
    blocks,
  };
}

/** Placed blocks of the copy's type that are not this own block already. */
export function replaceableBlocks(n: Newsletter, type: Block['type'], ownBlockId: string): Block[] {
  return n.blocks.filter((b) => b.type === type && b.own?.blockId !== ownBlockId);
}

/**
 * "Replace all blocks of this type with the copy" (decisions 33, 49): texts and images of each
 * placed block stay, layout options and colors come from the copy, and its own colors are dropped.
 */
export function replaceBlocksWithClone(n: Newsletter, input: { content: CloneContent; ref: OwnBlockRef }): Newsletter {
  const { block: copy } = input.content;
  const targets = new Set(replaceableBlocks(n, copy.type, input.ref.blockId).map((b) => b.id));
  if (!targets.size) return n;
  let colors = n.globals.colors;
  const layout = LAYOUT_FIELDS[copy.type] ?? [];
  const blocks = n.blocks.map((b) => {
    if (!targets.has(b.id)) return b;
    colors = withOwnColors(colors, b.id, input.content.colors);
    const fromCopy = Object.fromEntries(layout.map((key) => [key, (copy as unknown as Record<string, unknown>)[key]]));
    return { ...b, ...structuredClone(fromCopy), own: { ...input.ref } } as Block;
  });
  return { ...n, globals: { ...n.globals, colors }, blocks };
}

/** Same content, so a draft that matches the stored state counts as unchanged. */
export function sameCloneContent(a: CloneContent, b: CloneContent): boolean {
  return JSON.stringify(normalizeCloneContent(a)) === JSON.stringify(normalizeCloneContent(b));
}
