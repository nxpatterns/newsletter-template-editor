/**
 * Schema v5 → v6 (alpha, one-shot conversion): the stars get general colors of their own, one for
 * the top stars (`starsTop`, header) and one for the bottom stars (`starsBottom`, footer), set in
 * the Brand tab instead of following the accent. Each starts with the color it showed so far: the
 * star color set in its frame, otherwise a changed accent. The star colors of header and footer
 * are no block colors any more. An early v6 draft with one shared `stars` color gives it to both.
 */
import { COLOR_MODES, isColorRole, parseHexColor, STANDARD_SETS, type ColorMode, type ColorRole } from '../colors/model';

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

const FRAME_STARS: readonly (readonly ['header' | 'footer', ColorRole])[] = [
  ['header', 'starsTop'],
  ['footer', 'starsBottom'],
];

function withoutStarSlot(blocks: Json, id: string): Json {
  if (!isObj(blocks[id])) return blocks;
  const { stars: _removed, ...rest } = blocks[id];
  const { [id]: _block, ...others } = blocks;
  return Object.keys(rest).length ? { ...others, [id]: rest } : others;
}

function migrateSet(raw: unknown, mode: ColorMode): unknown {
  if (!isObj(raw)) return raw;
  const { stars: shared, ...general }: Json = isObj(raw['general']) ? raw['general'] : {};
  const blocks: Json = isObj(raw['blocks']) ? raw['blocks'] : {};
  const colorOf = (role: ColorRole): string => parseHexColor(general[role]) ?? STANDARD_SETS[mode][role];
  const slotHex = (id: string): string | null => {
    const slot = isObj(blocks[id]) ? blocks[id]['stars'] : undefined;
    if (!isObj(slot)) return null;
    return isColorRole(slot['role']) ? colorOf(slot['role']) : parseHexColor(slot['hex']);
  };
  for (const [frame, role] of FRAME_STARS) {
    if (parseHexColor(general[role]) !== null) continue;
    const hex = parseHexColor(shared) ?? slotHex(frame) ?? colorOf('accent');
    if (hex !== STANDARD_SETS[mode][role]) general[role] = hex;
  }
  return { ...raw, general, blocks: withoutStarSlot(withoutStarSlot(blocks, 'header'), 'footer') };
}

/** Data that still has the shared star color of an early v6 draft. */
export const hasSharedStarsColor = (globals: unknown): boolean =>
  isObj(globals) &&
  isObj(globals['colors']) &&
  COLOR_MODES.some((m) => {
    const set = (globals['colors'] as Json)[m];
    return isObj(set) && isObj(set['general']) && 'stars' in set['general'];
  });

export function migrateNewsletterV5ToV6<T>(n: T): T {
  if (!isObj(n) || !isObj(n['globals'])) return n;
  const { globals } = n;
  const colors = globals['colors'];
  if (!isObj(colors)) return { ...n, schemaVersion: 6 } as T;
  const next: Json = { ...colors };
  for (const mode of COLOR_MODES) next[mode] = migrateSet(colors[mode], mode);
  return { ...n, globals: { ...globals, colors: next }, schemaVersion: 6 } as T;
}
