import { resetBlockColor, setGeneralColor, slotDef, slotOverride, type ColorTarget, type SlotRef } from './edit';
import type { ColorMode, ColorRole, ColorsConfig, SlotColor } from './model';

function sameSlotColor(a: SlotColor | undefined, b: SlotColor | undefined): boolean {
  if (!a || !b) return a === b;
  if ('hex' in a) return 'hex' in b && a.hex === b.hex;
  return 'role' in b && a.role === b.role;
}

/** Other blocks of the same type as `source`. */
export function sameTypeTargets(source: ColorTarget, targets: readonly ColorTarget[]): ColorTarget[] {
  return targets.filter((t) => t.type === source.type && t.id !== source.id);
}

/** True when both blocks set exactly the same colors in `mode`. */
export function sameBlockColors(colors: ColorsConfig, mode: ColorMode, a: string, b: string): boolean {
  const x = colors[mode].blocks[a] ?? {};
  const y = colors[mode].blocks[b] ?? {};
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].every((k) => sameSlotColor(x[k], y[k]));
}

/** Colors set in other blocks of the same type that copying the colors of `source` would replace. */
export function copyConflicts(
  colors: ColorsConfig,
  mode: ColorMode,
  source: ColorTarget,
  targets: readonly ColorTarget[],
): SlotRef[] {
  const src = colors[mode].blocks[source.id] ?? {};
  const out: SlotRef[] = [];
  for (const target of sameTypeTargets(source, targets)) {
    for (const [key, value] of Object.entries(colors[mode].blocks[target.id] ?? {})) {
      if (!sameSlotColor(src[key], value)) out.push({ target, key });
    }
  }
  return out;
}

/**
 * Give every other block of the same type exactly the block colors of `source` in the active set.
 * A one-time copy: blocks added later still start from the general colors.
 */
export function copyBlockColors(colors: ColorsConfig, source: ColorTarget, targets: readonly ColorTarget[]): ColorsConfig {
  const mode = colors.mode;
  const src = colors[mode].blocks[source.id];
  const blocks = { ...colors[mode].blocks };
  for (const t of sameTypeTargets(source, targets)) {
    if (src) blocks[t.id] = { ...src };
    else delete blocks[t.id];
  }
  return { ...colors, [mode]: { ...colors[mode], blocks } };
}

/** The general color a fixed block value can become, or null when the slot has no fixed value. */
export function promotableRole(colors: ColorsConfig, mode: ColorMode, target: ColorTarget, key: string): ColorRole | null {
  const o = slotOverride(colors, mode, target.id, key);
  return o && 'hex' in o ? (slotDef(target, key)?.role ?? null) : null;
}

/**
 * Make the fixed value of one block color the general color it belongs to; that block color then
 * follows the general color again. `refs` and `keepIndividual` work as in `setGeneralColor`.
 */
export function promoteToGeneral(
  colors: ColorsConfig,
  target: ColorTarget,
  key: string,
  refs: readonly SlotRef[] = [],
  keepIndividual = true,
): ColorsConfig {
  const role = promotableRole(colors, colors.mode, target, key);
  const o = slotOverride(colors, colors.mode, target.id, key);
  if (!role || !o || !('hex' in o)) return colors;
  const others = refs.filter((r) => !(r.target.id === target.id && r.key === key));
  return resetBlockColor(setGeneralColor(colors, role, o.hex, others, keepIndividual), target.id, key);
}
