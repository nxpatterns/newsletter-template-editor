import type { Block } from '../../../core';

/** Implemented types available in the catalog (expand as core grows). */
export const CATALOG_TYPES: readonly Block['type'][] = [
  'hero',
  'chapter-band',
  'pull-quote',
  'paragraph',
  'stat-box',
  'benefits-list',
  'price-box',
  'cta-button',
  'cta-link-list',
  'divider',
] as const;

const ICONS: Record<Block['type'], string> = {
  hero: '✨',
  paragraph: '¶',
  divider: '—',
  'cta-button': '▶',
  'chapter-band': '▣',
  'pull-quote': '❝',
  'stat-box': '＃',
  'benefits-list': '✓',
  'price-box': '€',
  'cta-link-list': '→',
};

export function blockTypeIcon(type: Block['type']): string {
  return ICONS[type] ?? '■';
}

/** Catalog card hue per block type: gradient pair (a → b) and ink for text on the gradient. */
export interface BlockTypeHue {
  a: string;
  b: string;
  ink: string;
}

const INK_DARK = '#0b1220';
const INK_LIGHT = '#ffffff';

const HUES: Record<Block['type'], BlockTypeHue> = {
  hero: { a: '#fb923c', b: '#ea580c', ink: INK_DARK },
  'chapter-band': { a: '#818cf8', b: '#4338ca', ink: INK_LIGHT },
  'pull-quote': { a: '#f472b6', b: '#be185d', ink: INK_LIGHT },
  paragraph: { a: '#60a5fa', b: '#1d4ed8', ink: INK_LIGHT },
  'stat-box': { a: '#c084fc', b: '#7e22ce', ink: INK_LIGHT },
  'benefits-list': { a: '#34d399', b: '#047857', ink: INK_DARK },
  'price-box': { a: '#fde047', b: '#ca8a04', ink: INK_DARK },
  'cta-button': { a: '#22d3ee', b: '#0e7490', ink: INK_DARK },
  'cta-link-list': { a: '#bef264', b: '#65a30d', ink: INK_DARK },
  divider: { a: '#94a3b8', b: '#475569', ink: INK_LIGHT },
};

const FALLBACK_HUE: BlockTypeHue = { a: '#94a3b8', b: '#475569', ink: INK_LIGHT };

export function blockTypeHue(type: Block['type']): BlockTypeHue {
  return HUES[type] ?? FALLBACK_HUE;
}
