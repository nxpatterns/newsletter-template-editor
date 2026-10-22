/**
 * Finite scales of the parts model (decisions 44, 78, 81). Stored blocks keep the token names
 * only; the px values here are best-guess starting values and may be replaced by measured ones
 * without a migration.
 */

export const TEXT_SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SIZE_PX: Readonly<Record<TextSize, number>> = {
  xs: 12,
  s: 14,
  m: 17,
  l: 20,
  xl: 26,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const SPACES = ['0', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl'] as const;
export type Space = (typeof SPACES)[number];
export const SPACE_PX: Readonly<Record<Space, number>> = {
  '0': 0,
  '2xs': 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
  '2xl': 48,
};

export const RADII = ['none', 's', 'm', 'l', 'round'] as const;
export type Radius = (typeof RADII)[number];
/** `round` is a pill: half of any height a part can have. */
export const RADIUS_PX: Readonly<Record<Radius, number>> = { none: 0, s: 4, m: 8, l: 16, round: 999 };

export const BORDER_WIDTHS = ['0', '1', '2', '4'] as const;
export type BorderWidth = (typeof BORDER_WIDTHS)[number];
export const BORDER_PX: Readonly<Record<BorderWidth, number>> = { '0': 0, '1': 1, '2': 2, '4': 4 };

export const BORDER_SIDES = ['all', 'top', 'bottom', 'left', 'y'] as const;
export type BorderSides = (typeof BORDER_SIDES)[number];

export const LINE_HEIGHTS = ['tight', 'normal', 'loose'] as const;
export type LineHeight = (typeof LINE_HEIGHTS)[number];
export const LINE_HEIGHT_FACTOR: Readonly<Record<LineHeight, number>> = { tight: 1.25, normal: 1.5, loose: 1.75 };

export const WEIGHTS = ['normal', 'bold'] as const;
export type Weight = (typeof WEIGHTS)[number];

export const LETTER_SPACINGS = ['none', 'wide', 'wider'] as const;
export type LetterSpacing = (typeof LETTER_SPACINGS)[number];
export const LETTER_SPACING_PX: Readonly<Record<LetterSpacing, number>> = { none: 0, wide: 1, wider: 2 };

/** Width as a share of the available width (decision 76). */
export const WIDTHS = ['full', '3/4', '2/3', '1/2', '1/3', '1/4'] as const;
export type WidthShare = (typeof WIDTHS)[number];
export const WIDTH_SHARE: Readonly<Record<WidthShare, number>> = {
  full: 1,
  '3/4': 3 / 4,
  '2/3': 2 / 3,
  '1/2': 1 / 2,
  '1/3': 1 / 3,
  '1/4': 1 / 4,
};

export const RATIOS = ['1:1', '1:2', '2:1', '1:3', '3:1', '1:1:1', '2:1:1', '1:2:1', '1:1:2', '1:1:1:1'] as const;
export type Ratio = (typeof RATIOS)[number];

/** Shares of one ratio, e.g. `2:1:1` → [2, 1, 1]. */
export function ratioParts(ratio: Ratio): number[] {
  return ratio.split(':').map(Number);
}

/** Ratios for a number of columns; the first one is the default. */
export function ratiosFor(count: number): Ratio[] {
  return RATIOS.filter((r) => ratioParts(r).length === count);
}

export const ICON_SIZES = ['s', 'm', 'l', 'xl'] as const;
export type IconSize = (typeof ICON_SIZES)[number];
export const ICON_PX: Readonly<Record<IconSize, number>> = { s: 16, m: 24, l: 32, xl: 48 };

export const BUTTON_SIZES = ['s', 'm', 'l'] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];
/** Text size and padding (vertical, horizontal) per button size. */
export const BUTTON_SIZE: Readonly<Record<ButtonSize, { text: TextSize; padV: number; padH: number }>> = {
  s: { text: 's', padV: 12, padH: 16 },
  m: { text: 'm', padV: 12, padH: 24 },
  l: { text: 'l', padV: 16, padH: 32 },
};

export const BLEEDS = ['content', 'full'] as const;
export type Bleed = (typeof BLEEDS)[number];

export const ALIGNS = ['left', 'center', 'right'] as const;
export type Align = (typeof ALIGNS)[number];

export const VALIGNS = ['top', 'middle', 'bottom'] as const;
export type Valign = (typeof VALIGNS)[number];

/** Line height in px for a size, rounded, so Outlook (`mso-line-height-rule: exactly`) matches. */
export function lineHeightPx(size: TextSize, lh: LineHeight): number {
  return Math.round(TEXT_SIZE_PX[size] * LINE_HEIGHT_FACTOR[lh]);
}

export const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);
