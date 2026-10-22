import type { NameRendering } from '../richtext/to-html';
import type { RenderMode } from './utils';
import type { Globals } from '../types';

/** Name pieces: the Listmonk template in the export, the sample name of the Campaign tab in the preview. */
export function nameRendering(ctx: { mode: RenderMode; globals: Globals }): NameRendering {
  return ctx.mode === 'export' ? 'listmonk' : { sample: ctx.globals.personalization?.samples['name'] ?? '' };
}
