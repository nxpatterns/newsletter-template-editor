import type { Block } from '../../../core';

/** Implemented types available in the catalog (expand as core grows). */
export const CATALOG_TYPES: readonly Block['type'][] = [
  'hero',
  'paragraph',
  'divider',
  'cta-button',
] as const;

const ICONS: Record<Block['type'], string> = {
  hero: '✨',
  paragraph: '¶',
  divider: '—',
  'cta-button': '▶',
};

export function blockTypeIcon(type: Block['type']): string {
  return ICONS[type] ?? '■';
}
