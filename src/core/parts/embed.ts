import { COLOR_MODES, type SlotColor } from '../colors/model';
import type { Block, Globals } from '../types';
import { activeDesign, walkNodes, type EmbedContent } from './model';

/**
 * Blocks embedded in free blocks (decisions 38, 43). Each renders under the id
 * `<outer id>-<part node id>` with its own colors on the block level, exactly as a placed block.
 */

export interface Embedded {
  block: Block;
  colors?: Record<string, SlotColor>;
}

/** The embedded block as it renders inside `outerId` at node `nodeId`. */
export function embeddedAs(outerId: string, nodeId: string, part: EmbedContent): Embedded {
  return { block: { ...part.block, id: `${outerId}-${nodeId}` } as Block, colors: part.colors };
}

/** Every block embedded in a block, nested ones too, in the ids they render under. */
export function embeddedBlocks(block: Block): Embedded[] {
  if (block.type !== 'free') return [];
  const parts = new Map(block.content.parts.map((p) => [p.id, p]));
  const out: Embedded[] = [];
  walkNodes(activeDesign(block).children, (n) => {
    if (n.kind !== 'block') return;
    const part = parts.get(n.part);
    if (part?.kind !== 'block') return;
    const e = embeddedAs(block.id, n.id, part);
    out.push(e, ...embeddedBlocks(e.block));
  });
  return out;
}

/** Globals with an embedded block's own colors on the block level of both sets. */
export function withEmbedColors(globals: Globals, id: string, colors: Record<string, SlotColor> | undefined): Globals {
  if (!colors || !Object.keys(colors).length) return globals;
  const next = { ...globals.colors };
  for (const mode of COLOR_MODES) next[mode] = { ...next[mode], blocks: { ...next[mode].blocks, [id]: { ...colors } } };
  return { ...globals, colors: next };
}
