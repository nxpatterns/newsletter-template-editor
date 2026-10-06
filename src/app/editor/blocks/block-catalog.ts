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
