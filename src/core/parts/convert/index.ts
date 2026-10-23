import type { BuiltInBlock, BuiltInType, FreeBlock } from '../../types';
import type { FreeBlockData } from '../model';
import { chapterToParts, ctaToParts, heroToParts, quoteToParts } from './blocks';
import { paragraphToParts } from './paragraph';

/**
 * Gate converters (decisions 45, 84 to 86): a built-in block as content plus default design of
 * the parts model. The built-in renderers stay (decision 85); the converters prove that the parts
 * model expresses every built-in type. `tools/gate/compare.ts` renders both exports side by side.
 */
export type Converter<T extends BuiltInBlock> = (block: T) => FreeBlockData;
export type ConverterRegistry = { [K in BuiltInType]?: Converter<Extract<BuiltInBlock, { type: K }>> };

export const CONVERTERS: ConverterRegistry = {
  paragraph: paragraphToParts,
  hero: heroToParts,
  'chapter-band': chapterToParts,
  'pull-quote': quoteToParts,
  'cta-button': ctaToParts,
};

/** Built-in types that have a converter, in registry order. */
export function convertedTypes(): BuiltInType[] {
  return Object.keys(CONVERTERS) as BuiltInType[];
}

/** The block as a free block with the same id; null while its type has no converter. */
export function toFreeBlock(block: BuiltInBlock): FreeBlock | null {
  const convert = CONVERTERS[block.type] as Converter<BuiltInBlock> | undefined;
  return convert ? { id: block.id, type: 'free', ...convert(block) } : null;
}

export { exportTextsAndLinks, compareTextsAndLinks, type TextsAndLinks } from './check';
