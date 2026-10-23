import type { RichDoc } from '../../richtext/model';
import { BORDER_PX, SPACE_PX, TEXT_SIZE_PX, type BorderWidth, type Space, type TextSize } from '../scales';

/**
 * Off-scale px of the built-in CSS snap to the nearest scale step (decision 86); a tie goes to
 * the smaller step. Converters name the built-in px, so the snap stays readable next to the CSS.
 */
function nearest<T extends string>(table: Readonly<Record<T, number>>, px: number): T {
  let best: T | null = null;
  for (const [token, v] of Object.entries(table) as [T, number][]) {
    if (best === null) best = token;
    const d = Math.abs(v - px);
    const b = Math.abs(table[best] - px);
    if (d < b || (d === b && v < table[best])) best = token;
  }
  return best!;
}

export const space = (px: number): Space => nearest(SPACE_PX, px);
export const textSize = (px: number): TextSize => nearest(TEXT_SIZE_PX, px);
export const border = (px: number): BorderWidth => nearest(BORDER_PX, px);

/** Plain text of a built-in field as a rich doc: one paragraph, line breaks kept. */
export function plainDoc(text: string): RichDoc {
  const lines = text.split(/\r\n|\r|\n/);
  return [{ type: 'p', children: lines.flatMap((t, i) => (i ? [{ type: 'br' as const }, { type: 'text' as const, text: t }] : [{ type: 'text' as const, text: t }])) }];
}
