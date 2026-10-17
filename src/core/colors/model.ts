/**
 * Color model of a newsletter template.
 *
 * Two separate sets per template (dark and light). Each set has three levels, lowest first:
 *   1. standard colors of the blocks (STANDARD_SETS, fixed in code)
 *   2. general colors of the template (`general`) override 1
 *   3. colors set directly in a block (`blocks`) override 2
 * A block color is either linked to a general color (`{ role }`) or a fixed value (`{ hex }`).
 */

export const COLOR_ROLES = [
  'page',
  'content',
  'surface',
  'body',
  'head',
  'dim',
  'link',
  'accent',
  'btn',
  'btnText',
  'line',
  'starsTop',
  'starsBottom',
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

/** General colors that are edited in the Brand tab instead of the Colors tab. */
export const BRAND_COLOR_ROLES: readonly ColorRole[] = ['starsTop', 'starsBottom'];
export const isBrandColorRole = (role: ColorRole): boolean => BRAND_COLOR_ROLES.includes(role);

export const COLOR_MODES = ['dark', 'light'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export type ColorSet = Record<ColorRole, string>;

/** A block color: follows a general color, or is a fixed value of its own. */
export type SlotColor = { role: ColorRole } | { hex: string };

export interface ColorSetEdits {
  /** Level 2: only the roles that differ from the standard set. */
  general: Partial<Record<ColorRole, string>>;
  /** Level 3: block id (or `header` / `footer`) → color slot key → color. */
  blocks: Record<string, Record<string, SlotColor>>;
}

export interface ColorsConfig {
  /** The set that is edited, previewed and exported. */
  mode: ColorMode;
  dark: ColorSetEdits;
  light: ColorSetEdits;
}

export const STANDARD_SETS: Readonly<Record<ColorMode, Readonly<ColorSet>>> = {
  dark: {
    page: '#08101e',
    content: '#0c1628',
    surface: '#060e1a',
    body: '#7a9ab8',
    head: '#d8eeff',
    dim: '#6b88a6',
    link: '#7ecfff',
    accent: '#f5c518',
    btn: '#1d6bb8',
    btnText: '#ffffff',
    line: '#1e3a5c',
    starsTop: '#f5c518',
    starsBottom: '#f5c518',
  },
  light: {
    page: '#e9eff6',
    content: '#ffffff',
    surface: '#eaf2fb',
    body: '#3b4f63',
    head: '#0c1d33',
    dim: '#56697c',
    link: '#1565b0',
    accent: '#8a6200',
    btn: '#1d6bb8',
    btnText: '#ffffff',
    line: '#cfdbe8',
    starsTop: '#8a6200',
    starsBottom: '#8a6200',
  },
};

export const FRAME_COLOR_IDS = ['header', 'footer'] as const;

const HEX_FULL = /^#[0-9a-f]{6}$/;

/** `#abc` / `#AABBCC` → `#aabbcc`; anything else → null. */
export function parseHexColor(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return HEX_FULL.test(s) ? s : null;
}

export const isColorRole = (v: unknown): v is ColorRole => (COLOR_ROLES as readonly unknown[]).includes(v);
export const isColorMode = (v: unknown): v is ColorMode => (COLOR_MODES as readonly unknown[]).includes(v);

export function emptyColorSetEdits(): ColorSetEdits {
  return { general: {}, blocks: {} };
}

export function defaultColors(): ColorsConfig {
  return { mode: 'dark', dark: emptyColorSetEdits(), light: emptyColorSetEdits() };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function normalizeEdits(raw: unknown, knownIds: ReadonlySet<string> | null): ColorSetEdits {
  const out = emptyColorSetEdits();
  if (!isObj(raw)) return out;
  if (isObj(raw['general'])) {
    for (const role of COLOR_ROLES) {
      const hex = parseHexColor(raw['general'][role]);
      if (hex) out.general[role] = hex;
    }
  }
  if (isObj(raw['blocks'])) {
    for (const [id, slots] of Object.entries(raw['blocks'])) {
      if (!isObj(slots) || (knownIds && !knownIds.has(id))) continue;
      const clean: Record<string, SlotColor> = {};
      for (const [key, v] of Object.entries(slots)) {
        if (!isObj(v)) continue;
        if (isColorRole(v['role'])) clean[key] = { role: v['role'] };
        else {
          const hex = parseHexColor(v['hex']);
          if (hex) clean[key] = { hex };
        }
      }
      if (Object.keys(clean).length) out.blocks[id] = clean;
    }
  }
  return out;
}

/** Valid colors for any input. Entries of blocks that no longer exist are dropped when ids are given. */
export function normalizeColors(raw: unknown, blockIds?: readonly string[]): ColorsConfig {
  const r = isObj(raw) ? raw : {};
  const known = blockIds ? new Set<string>([...blockIds, ...FRAME_COLOR_IDS]) : null;
  return {
    mode: isColorMode(r['mode']) ? r['mode'] : 'dark',
    dark: normalizeEdits(r['dark'], known),
    light: normalizeEdits(r['light'], known),
  };
}

/** Level 1 + 2: the general colors of a set. */
export function resolveGeneralColors(colors: ColorsConfig, mode: ColorMode = colors.mode): ColorSet {
  return { ...STANDARD_SETS[mode], ...colors[mode].general };
}

/** The general colors of the set that is currently active. */
export function activeColors(colors: ColorsConfig | undefined): ColorSet {
  return resolveGeneralColors(colors ?? defaultColors());
}
