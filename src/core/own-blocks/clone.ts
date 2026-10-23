import {
  COLOR_MODES,
  COLOR_ROLES,
  defaultColors,
  isColorRole,
  normalizeColors,
  parseHexColor,
  resolveGeneralColors,
  type ColorsConfig,
  type SlotColor,
} from '../colors/model';
import { slotsOf } from '../colors/slots';
import { colorTargetOf } from '../parts/colors';
import { emptyFreeData } from '../parts/operations';
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
  /** `clone`: a copy of a built-in block; `free`: a free block composed from parts (same shape). */
  kind: 'clone' | 'free';
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
  return isObj(v) && (v['kind'] === 'clone' || v['kind'] === 'free') && isObj(v['block']) && typeof v['block']['type'] === 'string';
}

const kindOf = (block: Block): CloneContent['kind'] => (block.type === 'free' ? 'free' : 'clone');

/** A new, empty free block (decision 48). */
export function newFreeContent(): CloneContent {
  return { kind: 'free', block: { id: CLONE_BLOCK_ID, type: 'free', ...emptyFreeData() }, colors: {} };
}

/** A fresh copy of a built-in block: its fields as given, its colors as the type's defaults. */
export function newCloneContent(block: Block): CloneContent {
  return { kind: 'clone', block: { ...structuredClone(block), id: CLONE_BLOCK_ID }, colors: {} };
}

/** Colors of the copy that the type knows, each a known role or a valid hex. */
function cleanColors(block: Block, raw: unknown): Record<string, SlotColor> {
  if (!isObj(raw)) return {};
  const keys = new Set(slotsOf(colorTargetOf(block)).map((s) => s.key));
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
  if (!block || kindOf(block) !== raw.kind) return null;
  delete block.own;
  return { kind: raw.kind, block, colors: cleanColors(block, raw.colors) };
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
  return { kind: kindOf(block), block: { ...structuredClone(block), id: CLONE_BLOCK_ID }, colors: { ...colors } };
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
  if (type === 'free') return [];
  return n.blocks.filter((b) => b.type === type && b.own?.blockId !== ownBlockId);
}

/**
 * "Replace all blocks of this type with the copy" (decisions 33, 49): texts and images of each
 * placed block stay, layout options and colors come from the copy, and its own colors are dropped.
 */
export function replaceBlocksWithClone(n: Newsletter, input: { content: CloneContent; ref: OwnBlockRef }): Newsletter {
  const targets = new Set(replaceableBlocks(n, input.content.block.type, input.ref.blockId).map((b) => b.id));
  if (!targets.size) return n;
  let colors = n.globals.colors;
  const blocks = n.blocks.map((b) => {
    if (!targets.has(b.id)) return b;
    colors = withOwnColors(colors, b.id, input.content.colors);
    return adoptCopy(b, input.content.block, input.ref);
  });
  return { ...n, globals: { ...n.globals, colors }, blocks };
}

/** Texts and images of `b` stay; layout options come from the copy (a free block takes the copy whole). */
function adoptCopy(b: Block, copy: Block, ref: OwnBlockRef): Block {
  if (copy.type === 'free') return { ...structuredClone(copy), id: b.id, own: { ...ref } } as Block;
  const layout = LAYOUT_FIELDS[copy.type] ?? [];
  const fromCopy = Object.fromEntries(layout.map((key) => [key, (copy as unknown as Record<string, unknown>)[key]]));
  return { ...b, ...structuredClone(fromCopy), own: { ...ref } } as Block;
}

/** The newer version of a placed own block's source that waits for "Update", or null (decision 50). */
export function newerVersionOf(block: Block, latest: number): number | null {
  const own = block.own;
  if (!own || latest <= own.version || own.dismissed === latest) return null;
  return latest;
}

/**
 * "Update" to a newer version (decision 52): the user's texts stay, layout and colors come from
 * the new version. A free block is its design, so it takes the new version whole.
 */
export function updatePlacedToVersion(n: Newsletter, input: { id: string; content: CloneContent; ref: OwnBlockRef }): Newsletter {
  const target = n.blocks.find((b) => b.id === input.id);
  if (!target?.own || target.own.blockId !== input.ref.blockId) return n;
  return {
    ...n,
    globals: { ...n.globals, colors: withOwnColors(n.globals.colors, input.id, input.content.colors) },
    blocks: n.blocks.map((b) => (b.id === input.id ? adoptCopy(b, input.content.block, input.ref) : b)),
  };
}

/** "Later": the notice for `version` stays hidden until an even newer version comes. */
export function dismissNewerVersion(n: Newsletter, input: { id: string; version: number }): Newsletter {
  return {
    ...n,
    blocks: n.blocks.map((b) => (b.id === input.id && b.own ? ({ ...b, own: { ...b.own, dismissed: input.version } } as Block) : b)),
  };
}

/** Same content, so a draft that matches the stored state counts as unchanged. */
export function sameCloneContent(a: CloneContent, b: CloneContent): boolean {
  return JSON.stringify(normalizeCloneContent(a)) === JSON.stringify(normalizeCloneContent(b));
}

/** One own color of a placed block and how "Save as own block" takes it over (decision 34). */
export interface PlacedColorChoice {
  key: string;
  /** The value the block shows in that set. */
  hex: string;
  /** A role the color follows from now on, or a fixed value. */
  color: SlotColor;
}

/**
 * The own colors of a placed block as the copy takes them (decision 34): a link stays a link, a
 * value equal to a general color follows that color (the slot's usual role first), any other value
 * stays fixed. The active set decides, since an own block has one choice for Light and Dark
 * (decision 51) and the block must look the same afterwards (decision 53).
 */
export function placedColorChoices(n: Newsletter, id: string): PlacedColorChoice[] {
  const block = n.blocks.find((b) => b.id === id);
  if (!block) return [];
  const general = resolveGeneralColors(n.globals.colors);
  const own = n.globals.colors[n.globals.colors.mode].blocks[id] ?? {};
  const out: PlacedColorChoice[] = [];
  for (const slot of slotsOf(colorTargetOf(block))) {
    const v = own[slot.key];
    if (!v) continue;
    if ('role' in v) {
      out.push({ key: slot.key, hex: general[v.role], color: { role: v.role } });
      continue;
    }
    const role = general[slot.role] === v.hex ? slot.role : COLOR_ROLES.find((r) => general[r] === v.hex);
    out.push({ key: slot.key, hex: v.hex, color: role ? { role } : { hex: v.hex } });
  }
  return out;
}

/** "Save as own block" from a placed block: its fields as starting texts, its colors per decision 34. */
export function cloneContentFromPlaced(n: Newsletter, id: string): CloneContent | null {
  const block = n.blocks.find((b) => b.id === id);
  if (!block) return null;
  const { own: _own, ...fields } = structuredClone(block);
  const colors = Object.fromEntries(placedColorChoices(n, id).map((c) => [c.key, c.color]));
  return { kind: kindOf(block), block: { ...fields, id: CLONE_BLOCK_ID } as Block, colors };
}

/**
 * That one placed block becomes the new own block (decision 53): same fields, its own colors are
 * now the copy's, in both sets.
 */
export function replacePlacedWithOwn(n: Newsletter, input: { id: string; content: CloneContent; ref: OwnBlockRef }): Newsletter {
  if (!n.blocks.some((b) => b.id === input.id)) return n;
  return {
    ...n,
    globals: { ...n.globals, colors: withOwnColors(n.globals.colors, input.id, input.content.colors) },
    blocks: n.blocks.map((b) => (b.id === input.id ? ({ ...b, own: { ...input.ref } } as Block) : b)),
  };
}
