import { FONT_PRESETS } from '../render/utils';
import { activeDesign, walkNodes, type FreeBlockData, type TextNode } from './model';
import { nodeClass } from './colors';
import {
  BORDER_PX,
  BORDER_SIDES,
  BORDER_WIDTHS,
  BUTTON_SIZE,
  BUTTON_SIZES,
  ICON_PX,
  ICON_SIZES,
  LETTER_SPACING_PX,
  LINE_HEIGHTS,
  lineHeightPx,
  RADII,
  RADIUS_PX,
  SPACE_PX,
  SPACES,
  TEXT_SIZE_PX,
  TEXT_SIZES,
  type BorderSides,
} from './scales';

/**
 * Stylesheet of the free block renderer, generated from the scales (one definition). Colors are
 * not here: they are color slot rules (`render/colors.ts`). Line heights are px with
 * `mso-line-height-rule: exactly`, so tight, normal and loose mean the same in classic Outlook.
 */

const SIDE_PROPS: Record<BorderSides, readonly string[]> = {
  all: ['border-width'],
  top: ['border-top-width'],
  bottom: ['border-bottom-width'],
  left: ['border-left-width'],
  y: ['border-top-width', 'border-bottom-width'],
};

function borderRules(): string[] {
  const out: string[] = [];
  for (const w of BORDER_WIDTHS) {
    if (w === '0') continue;
    for (const side of BORDER_SIDES) {
      const widths = side === 'all' ? `border-width: ${BORDER_PX[w]}px;` : `border-width: 0; ${SIDE_PROPS[side].map((p) => `${p}: ${BORDER_PX[w]}px;`).join(' ')}`;
      out.push(`.fp-bd-${w}-${side} { border-style: solid; ${widths} }`);
    }
  }
  return out;
}

function textRules(): string[] {
  const out: string[] = [];
  for (const size of TEXT_SIZES) {
    for (const lh of LINE_HEIGHTS) {
      out.push(`.fp-t-${size}-${lh} { font-size: ${TEXT_SIZE_PX[size]}px; line-height: ${lineHeightPx(size, lh)}px; mso-line-height-rule: exactly; }`);
    }
  }
  return out;
}

/** Static rules; included once when a document has free blocks. */
export function freeBlockCss(): string {
  const space = SPACES.filter((s) => s !== '0');
  return [
    '/* Free blocks (parts renderer) */',
    '.fb-root { background-color: var(--email-content); }',
    '.fp-node { mso-line-height-rule: exactly; }',
    ...space.map((s) => `.fp-pv-${s} { padding-top: ${SPACE_PX[s]}px; padding-bottom: ${SPACE_PX[s]}px; }`),
    ...space.map((s) => `.fp-ph-${s} { padding-left: ${SPACE_PX[s]}px; padding-right: ${SPACE_PX[s]}px; }`),
    '.fp-bleed { padding: 0; }',
    ...borderRules(),
    ...RADII.filter((r) => r !== 'none').map((r) => `.fp-r-${r} { border-radius: ${RADIUS_PX[r]}px; }`),
    '.fp-a-left { text-align: left; }',
    '.fp-a-center { text-align: center; }',
    '.fp-a-right { text-align: right; }',
    '.fp-p { margin: 0 0 12px 0; padding: 0; color: var(--email-body); }',
    '.fp-p:last-child { margin-bottom: 0; }',
    ...textRules(),
    '.fp-f-tpl { font-family: var(--email-font); }',
    ...Object.entries(FONT_PRESETS).map(([key, f]) => `.fp-f-${key} { font-family: ${f.stack}; }`),
    '.fp-regular { font-weight: 400; }',
    '.fp-bold { font-weight: 700; }',
    '.fp-italic { font-style: italic; }',
    '.fp-upper { text-transform: uppercase; }',
    `.fp-ls-wide { letter-spacing: ${LETTER_SPACING_PX.wide}px; }`,
    `.fp-ls-wider { letter-spacing: ${LETTER_SPACING_PX.wider}px; }`,
    '.fp-img { display: block; max-width: 100%; height: auto; border: 0; outline: none; text-decoration: none; }',
    // On the image itself: the export inliner drops descendant selectors.
    '.fp-img-center { margin: 0 auto; }',
    '.fp-img-right { margin: 0 0 0 auto; }',
    '.fp-img-link { display: block; }',
    ...BUTTON_SIZES.map((b) => `.fp-btn-${b} { padding: ${BUTTON_SIZE[b].padV}px ${BUTTON_SIZE[b].padH}px; }`),
    '.fp-btn-cell { mso-padding-alt: 0; }',
    '.fp-btn-outline { border: 2px solid var(--email-btn); }',
    '.fp-btn-filled { background-color: var(--email-btn); }',
    `a.fp-btn-link { display: inline-block; font-family: var(--email-font); font-weight: 700; text-decoration: none; color: var(--email-btn-text); }`,
    ...BUTTON_SIZES.map((b) => {
      const t = BUTTON_SIZE[b].text;
      return `a.fp-btn-t-${t} { font-size: ${TEXT_SIZE_PX[t]}px; line-height: ${lineHeightPx(t, 'tight')}px; mso-line-height-rule: exactly; }`;
    }),
    ...ICON_SIZES.map((i) => `.fp-icon-${i} { display: inline-block; font-size: ${ICON_PX[i]}px; line-height: ${ICON_PX[i]}px; mso-line-height-rule: exactly; }`),
    ...ICON_SIZES.map((i) => `.fp-icon-w-${i} { width: ${ICON_PX[i]}px; text-align: center; }`),
    // In a circle the glyph is a block, so the cell centers its box and not a line box of the inherited line height.
    '.fp-icon-c { display: block; }',
    ...ICON_SIZES.map((i) => `.fp-icon-play-${i} { padding: ${ICON_PX[i] / 8}px 0 0 ${ICON_PX[i] / 4}px; }`),
    '.fp-icon { color: var(--email-link); font-family: Arial, Helvetica, sans-serif; }',
    // Longhands only: a shorthand after the slot color would reset it once the export inlines both.
    '.fp-divider { font-size: 0; line-height: 0; mso-line-height-rule: exactly; border-top-color: var(--email-line); }',
    ...['solid', 'dashed', 'dotted'].flatMap((line) =>
      BORDER_WIDTHS.filter((w) => w !== '0').map((w) => `.fp-dv-${line}-${w} { border-top-width: ${BORDER_PX[w]}px; border-top-style: ${line}; height: 0; }`),
    ),
    ...SPACES.map((s) => `.fp-h-${s} { font-size: 0; line-height: ${SPACE_PX[s]}px; height: ${SPACE_PX[s]}px; mso-line-height-rule: exactly; }`),
    '.fp-spacer, .fp-gap { font-size: 0; line-height: 0; }',
  ].join('\n  ');
}

/** Phone rules (inside the 600 px media query): stacking columns, their spacing and their full width images. */
export function freeBlockMobileCss(): string {
  return [
    '.fp-col-s { display: block !important; width: 100% !important; }',
    '.fp-gap-s { display: none !important; }',
    '.fp-w { width: 100% !important; }',
    '.fp-img-fill { width: 100% !important; max-width: 100% !important; }',
    ...SPACES.filter((s) => s !== '0').map((s) => `.fp-cn-${s} { padding-top: ${SPACE_PX[s]}px !important; }`),
  ].join('\n    ');
}

/** Rules for custom font stacks set on a block or a text part (no inline styles in the markup). */
export function freeBlockFontCss(scope: string, data: FreeBlockData): string[] {
  const design = activeDesign(data);
  const rules: string[] = [];
  const clean = (stack: string) => stack.replace(/[;{}<>]/g, '').trim();
  if (design.style.font === 'custom' && design.style.customFont?.trim()) {
    rules.push(`.${scope} .fp-f-custom { font-family: ${clean(design.style.customFont)}; }`);
  }
  walkNodes(design.children, (n) => {
    const t = n as TextNode;
    if (n.kind === 'text' && t.font === 'custom' && t.customFont?.trim()) {
      rules.push(`.${scope} .${nodeClass(n.id)} .fp-f-custom { font-family: ${clean(t.customFont)}; }`);
    }
  });
  return rules;
}
