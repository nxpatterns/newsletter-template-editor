import { contrastRatio, TEXT_CONTRAST_MIN } from './contrast';
import {
  isBrandColorRole,
  parseHexColor,
  resolveGeneralColors,
  type ColorMode,
  type ColorRole,
  type ColorsConfig,
  type SlotColor,
} from './model';
import { slotsOf, type ColorSlotDef } from './slots';

/** A block of the newsletter as far as colors are concerned (`header` / `footer` for the frame). */
export interface ColorTarget {
  id: string;
  type: string;
  /** Slots of a free block, which differ per block (`parts/colors.ts`). */
  slots?: readonly ColorSlotDef[];
}

export const FRAME_TARGETS: readonly ColorTarget[] = [
  { id: 'header', type: 'header' },
  { id: 'footer', type: 'footer' },
];

export interface ResolvedSlot {
  hex: string;
  /** `own`: fixed value set in the block. `general`: follows a general color (default or linked). */
  source: 'general' | 'own';
  /** The general color it follows; absent for a fixed value. */
  role?: ColorRole;
}

export function slotDef(target: ColorTarget | string, key: string): ColorSlotDef | undefined {
  return slotsOf(typeof target === 'string' ? { type: target } : target).find((s) => s.key === key);
}

export function slotOverride(colors: ColorsConfig, mode: ColorMode, id: string, key: string): SlotColor | undefined {
  return colors[mode].blocks[id]?.[key];
}

/** Level 3 over 2 over 1 for one color of one block. */
export function resolveSlot(colors: ColorsConfig, mode: ColorMode, target: ColorTarget, key: string): ResolvedSlot {
  const def = slotDef(target, key);
  const general = resolveGeneralColors(colors, mode);
  const o = slotOverride(colors, mode, target.id, key);
  if (o && 'hex' in o) return { hex: o.hex, source: 'own' };
  const role = o && 'role' in o ? o.role : (def?.role ?? 'body');
  return { hex: general[role], source: 'general', role };
}

/**
 * Every color of a block as the preview draws it (level 3 over 2 over 1): slot key → hex.
 * Shared by the renderer and the editor so both show the same colors.
 */
export function effectiveSlotColors(
  colors: ColorsConfig,
  target: ColorTarget,
  mode: ColorMode = colors.mode,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of slotsOf(target)) out[def.key] = resolveSlot(colors, mode, target, def.key).hex;
  return out;
}

export function blockOverrideKeys(colors: ColorsConfig, mode: ColorMode, id: string): string[] {
  return Object.keys(colors[mode].blocks[id] ?? {});
}

/** Number of colors a block has changed (fixed values and links to another general color). */
export function blockOverrideCount(colors: ColorsConfig, mode: ColorMode, id: string): number {
  return blockOverrideKeys(colors, mode, id).length;
}

/** Fixed value set in the block while its general color is something else now. */
export function isOutdatedOverride(colors: ColorsConfig, mode: ColorMode, target: ColorTarget, key: string): boolean {
  const o = slotOverride(colors, mode, target.id, key);
  const def = slotDef(target, key);
  if (!o || !('hex' in o) || !def) return false;
  return o.hex !== resolveGeneralColors(colors, mode)[def.role];
}

export interface SlotRef {
  target: ColorTarget;
  key: string;
}

/** Colors fixed in a block whose general color is `role`: they would be overwritten by "use everywhere". */
export function overridesOfRole(colors: ColorsConfig, mode: ColorMode, targets: readonly ColorTarget[], role: ColorRole): SlotRef[] {
  const out: SlotRef[] = [];
  for (const target of targets) {
    for (const key of blockOverrideKeys(colors, mode, target.id)) {
      const def = slotDef(target, key);
      const o = slotOverride(colors, mode, target.id, key);
      if (def && def.role === role && o && 'hex' in o) out.push({ target, key });
    }
  }
  return out;
}

const withMode = (colors: ColorsConfig, mode: ColorMode, next: ColorsConfig[ColorMode]): ColorsConfig => ({
  ...colors,
  [mode]: next,
});

export function setColorMode(colors: ColorsConfig, mode: ColorMode): ColorsConfig {
  return { ...colors, mode };
}

/**
 * Change a general color of the active set. `keepIndividual` false also removes the fixed
 * block values (`refs`) that overrode it, so the new color shows everywhere.
 */
export function setGeneralColor(
  colors: ColorsConfig,
  role: ColorRole,
  hex: string,
  refs: readonly SlotRef[] = [],
  keepIndividual = true,
): ColorsConfig {
  const value = parseHexColor(hex);
  if (!value) return colors;
  const mode = colors.mode;
  let blocks = colors[mode].blocks;
  if (!keepIndividual) for (const r of refs) blocks = withoutSlot(blocks, r.target.id, r.key);
  return withMode(colors, mode, { general: { ...colors[mode].general, [role]: value }, blocks });
}

export function resetGeneralColor(colors: ColorsConfig, role: ColorRole): ColorsConfig {
  const { [role]: _removed, ...general } = colors[colors.mode].general;
  return withMode(colors, colors.mode, { ...colors[colors.mode], general });
}

/** Every general color of the Colors tab; the ones set in the Brand tab stay. */
export function resetAllGeneralColors(colors: ColorsConfig): ColorsConfig {
  const kept = Object.fromEntries(
    Object.entries(colors[colors.mode].general).filter(([role]) => isBrandColorRole(role as ColorRole)),
  );
  return withMode(colors, colors.mode, { ...colors[colors.mode], general: kept });
}

function withoutSlot(
  blocks: ColorsConfig[ColorMode]['blocks'],
  id: string,
  key: string,
): ColorsConfig[ColorMode]['blocks'] {
  const { [key]: _removed, ...rest } = blocks[id] ?? {};
  const { [id]: _block, ...others } = blocks;
  return Object.keys(rest).length ? { ...others, [id]: rest } : others;
}

/** Set one color of a block: a general color to follow (`{ role }`) or a fixed value (`{ hex }`). */
export function setBlockColor(colors: ColorsConfig, id: string, key: string, value: SlotColor): ColorsConfig {
  const mode = colors.mode;
  let clean: SlotColor | null = null;
  if ('role' in value) clean = value;
  else {
    const hex = parseHexColor(value.hex);
    if (hex) clean = { hex };
  }
  if (!clean) return colors;
  const blocks = colors[mode].blocks;
  return withMode(colors, mode, { ...colors[mode], blocks: { ...blocks, [id]: { ...blocks[id], [key]: clean } } });
}

/** Back to the general color the slot started with. */
export function resetBlockColor(colors: ColorsConfig, id: string, key: string): ColorsConfig {
  return withMode(colors, colors.mode, {
    ...colors[colors.mode],
    blocks: withoutSlot(colors[colors.mode].blocks, id, key),
  });
}

export function resetBlockColors(colors: ColorsConfig, id: string): ColorsConfig {
  const { [id]: _removed, ...blocks } = colors[colors.mode].blocks;
  return withMode(colors, colors.mode, { ...colors[colors.mode], blocks });
}

export interface ContrastIssue {
  /** Text color and the surface it sits on. */
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  /** `inherited`: caused by general colors; `own`: by a color set in this block. */
  cause: 'inherited' | 'own';
  /** Slot of the same block this color sits on. */
  onKey: string;
}

/** Contrast problem of one text color, or null when it is readable or not a text color. */
export function slotContrastIssue(
  colors: ColorsConfig,
  mode: ColorMode,
  target: ColorTarget,
  key: string,
): ContrastIssue | null {
  const def = slotDef(target, key);
  if (!def || def.kind !== 'text') return null;
  const onKey = def.on ?? 'background';
  const fg = resolveSlot(colors, mode, target, key);
  const bg = resolveSlot(colors, mode, target, onKey);
  const ratio = contrastRatio(fg.hex, bg.hex);
  if (ratio >= TEXT_CONTRAST_MIN) return null;
  return {
    fg: fg.hex,
    bg: bg.hex,
    ratio,
    min: TEXT_CONTRAST_MIN,
    cause: fg.source === 'own' || bg.source === 'own' ? 'own' : 'inherited',
    onKey,
  };
}

export interface StarsContrastIssue {
  /** Frame part the stars sit in. */
  frame: 'header' | 'footer';
  fg: string;
  bg: string;
  ratio: number;
  min: number;
}

/** General color of the stars in the header and in the footer. */
export const STARS_ROLE: Readonly<Record<'header' | 'footer', ColorRole>> = { header: 'starsTop', footer: 'starsBottom' };

/** Contrast problems of the top stars against the header and the bottom stars against the footer background. */
export function starsContrastIssues(colors: ColorsConfig, mode: ColorMode = colors.mode): StarsContrastIssue[] {
  const general = resolveGeneralColors(colors, mode);
  const out: StarsContrastIssue[] = [];
  for (const target of FRAME_TARGETS) {
    const fg = general[STARS_ROLE[target.id as 'header' | 'footer']];
    const bg = resolveSlot(colors, mode, target, 'background').hex;
    const ratio = contrastRatio(fg, bg);
    if (ratio < TEXT_CONTRAST_MIN) out.push({ frame: target.id as 'header' | 'footer', fg, bg, ratio, min: TEXT_CONTRAST_MIN });
  }
  return out;
}
