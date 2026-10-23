import type { SlotColor } from '../../colors/model';
import type { BuiltInBlock, BuiltInType, FreeBlock } from '../../types';
import type { FreeBlockData } from '../model';
import { chapterToParts, ctaToParts, dividerToParts, heroToParts, quoteToParts } from './blocks';
import { imageTextToParts, imageToParts, videoToParts } from './images';
import { paragraphToParts } from './paragraph';
import { priceToParts, statToParts } from './numbers';
import { contactToParts, testimonialToParts } from './people';

/**
 * Gate converters (decisions 45, 84 to 86): a built-in block as content plus default design of
 * the parts model. The built-in renderers stay (decision 85); the converters prove that the parts
 * model expresses every built-in type. `tools/gate/compare.ts` renders both exports side by side.
 */
export type Converter<T extends BuiltInBlock> = (block: T) => Converted;

/** A converted block plus the slot colors it binds to other roles than the slot defaults (block level, both sets). */
export interface Converted extends FreeBlockData {
  colors?: Record<string, SlotColor>;
}
export type ConverterRegistry = { [K in BuiltInType]?: Converter<Extract<BuiltInBlock, { type: K }>> };

export const CONVERTERS: ConverterRegistry = {
  paragraph: paragraphToParts,
  hero: heroToParts,
  'chapter-band': chapterToParts,
  'pull-quote': quoteToParts,
  'cta-button': ctaToParts,
  divider: dividerToParts,
  image: imageToParts,
  'image-text': imageTextToParts,
  video: videoToParts,
  testimonial: testimonialToParts,
  contact: contactToParts,
  'stat-box': statToParts,
  'price-box': priceToParts,
};

/** Built-in types that have a converter, in registry order. */
export function convertedTypes(): BuiltInType[] {
  return Object.keys(CONVERTERS) as BuiltInType[];
}

/** The block as a free block with the same id plus its slot colors; null while its type has no converter. */
export function convertBlock(block: BuiltInBlock): { block: FreeBlock; colors: Record<string, SlotColor> } | null {
  const convert = CONVERTERS[block.type] as Converter<BuiltInBlock> | undefined;
  if (!convert) return null;
  const { colors = {}, ...data } = convert(block);
  return { block: { id: block.id, type: 'free', ...data }, colors };
}

/** The block as a free block with the same id; null while its type has no converter. */
export function toFreeBlock(block: BuiltInBlock): FreeBlock | null {
  return convertBlock(block)?.block ?? null;
}

export { exportTextsAndLinks, compareTextsAndLinks, type TextsAndLinks } from './check';
