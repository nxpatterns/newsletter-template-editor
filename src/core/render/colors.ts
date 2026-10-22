import { resolveSlot, type ColorTarget } from '../colors/edit';
import { activeColors, type ColorSet } from '../colors/model';
import { slotsOf } from '../colors/slots';
import { colorTargetOf } from '../parts/colors';
import { embeddedBlocks, withEmbedColors } from '../parts/embed';
import type { Block, Globals } from '../types';
import { escapeAttr } from './utils';

/** Header and footer are colored like blocks, under these ids. */
export const HEADER_TARGET: ColorTarget = { id: 'header', type: 'header' };
export const FOOTER_TARGET: ColorTarget = { id: 'footer', type: 'footer' };

export function renderPalette(globals: Globals): ColorSet {
  return activeColors(globals.colors);
}

/** Effective color of one block color in the active set. */
export function slotHex(globals: Globals, target: ColorTarget, key: string): string {
  return escapeAttr(resolveSlot(globals.colors, globals.colors.mode, target, key).hex);
}

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

const overridesOf = (globals: Globals, id: string) => globals.colors[globals.colors.mode].blocks[id] ?? {};

/** Class that scopes the block's own color rules; empty when it has none. */
export function colorScopeClass(globals: Globals, id: string): string {
  return Object.keys(overridesOf(globals, id)).length ? `cb-${safeId(id)}` : '';
}

/**
 * Stylesheet rules for colors set in a block (level 3). Rules come after the general ones, so
 * they win; the export inliner bakes them onto the elements. `important` repeats them inside the
 * dark-scheme media query, where the general colors are forced.
 */
export function blockColorCss(globals: Globals, blocks: readonly Block[], important = false): string {
  // Blocks embedded in free blocks color like placed blocks, with their own colors (decision 38).
  const targets: { target: ColorTarget; globals: Globals }[] = [
    ...[HEADER_TARGET, FOOTER_TARGET, ...blocks.map(colorTargetOf)].map((target) => ({ target, globals })),
    ...blocks.flatMap(embeddedBlocks).map((e) => ({ target: colorTargetOf(e.block), globals: withEmbedColors(globals, e.block.id, e.colors) })),
  ];
  const flag = important ? ' !important' : '';
  const rules: string[] = [];
  for (const { target, globals } of targets) {
    const own = overridesOf(globals, target.id);
    // A free block has no general rules for its parts: every slot gets a rule.
    const all = !!target.slots;
    if (!all && !Object.keys(own).length) continue;
    const scope = `cb-${safeId(target.id)}`;
    for (const def of slotsOf(target)) {
      if (!all && !own[def.key]) continue;
      const hex = slotHex(globals, target, def.key);
      for (const c of def.css) {
        rules.push(`.${scope} ${c.sel}, ${c.sel}.${scope} { ${c.prop}: ${hex}${flag}; }`);
      }
    }
  }
  return rules.join('\n  ');
}
