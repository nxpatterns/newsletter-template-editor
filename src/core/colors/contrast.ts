import { mixHex } from '../render/utils';
import { parseHexColor } from './model';

/** Minimum contrast ratio for text (WCAG AA, normal text). */
export const TEXT_CONTRAST_MIN = 4.5;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = parseHexColor(hex);
  if (!h) return 0;
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Nearest color to `fg` (same hue, moved toward white or black) that reaches `min` against `bg`.
 * Returns `fg` unchanged if it already does.
 */
export function makeReadable(fg: string, bg: string, min = TEXT_CONTRAST_MIN): string {
  const start = parseHexColor(fg);
  if (!start || !parseHexColor(bg)) return fg;
  if (contrastRatio(start, bg) >= min) return start;
  const towardLight = luminance(bg) < 0.5;
  const target = towardLight ? '#ffffff' : '#000000';
  for (let share = 0.95; share >= 0; share -= 0.05) {
    const candidate = mixHex(start, target, share);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return target;
}
