import type { FontFamilyPreset, Globals } from '../types';

export type RenderMode = 'preview' | 'export';

export const FONT_PRESETS: Record<
  Exclude<FontFamilyPreset, 'Custom'>,
  { label: string; stack: string }
> = {
  Georgia: { label: 'Georgia (Serif)', stack: "Georgia, Times, 'Times New Roman', serif" },
  'Times-New-Roman': {
    label: 'Times New Roman (Serif)',
    stack: "'Times New Roman', Times, serif",
  },
  Palatino: {
    label: 'Palatino (Serif)',
    stack: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  },
  Arial: { label: 'Arial (Sans)', stack: 'Arial, Helvetica, sans-serif' },
  'Arial-Narrow': { label: 'Arial Narrow (Sans)', stack: "'Arial Narrow', Arial, sans-serif" },
  Helvetica: { label: 'Helvetica (Sans)', stack: 'Helvetica, Arial, sans-serif' },
  Verdana: { label: 'Verdana (Sans)', stack: 'Verdana, Geneva, sans-serif' },
  Tahoma: { label: 'Tahoma (Sans)', stack: 'Tahoma, Geneva, sans-serif' },
  'Trebuchet-MS': {
    label: 'Trebuchet MS (Sans)',
    stack: "'Trebuchet MS', Tahoma, Verdana, Arial, sans-serif",
  },
  'Lucida-Sans': {
    label: 'Lucida Sans (Sans)',
    stack: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
  },
  'Courier-New': { label: 'Courier New (Mono)', stack: "'Courier New', Courier, monospace" },
};

export function fontStack(globals: Globals): string {
  if (globals.fontFamily === 'Custom') {
    return globals.customFont?.trim() || FONT_PRESETS.Georgia.stack;
  }
  return FONT_PRESETS[globals.fontFamily]?.stack || FONT_PRESETS.Georgia.stack;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Attribute escaping for plain URLs / text.
 * Do NOT run this on already-built `{{ TrackLink "url" }}` values —
 * ListMonk needs the raw double quotes inside the expression.
 */
export function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/** Wrap http(s) hrefs with ListMonk TrackLink for export mode. */
export function trackLink(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '#';
  if (
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('{{') ||
    trimmed.startsWith('javascript:')
  ) {
    return trimmed;
  }
  return `{{ TrackLink "${trimmed}" }}`;
}

export function resolveHref(href: string | undefined, mode: RenderMode): string {
  const raw = (href ?? '').trim();
  if (!raw) return '#';
  return mode === 'export' ? trackLink(raw) : raw;
}

/** Export mode: leave TrackLink expressions intact; preview: escape plain URLs. */
export function attrHref(href: string, mode: RenderMode): string {
  return mode === 'export' ? href : escapeAttr(href);
}

export function resolveListMonkForPreview(
  html: string,
  subject = 'Newsletter subject',
): string {
  return html
    .replace(/\{\{\s*\.Campaign\.Subject\s*\}\}/g, escapeHtml(subject || 'Newsletter subject'))
    .replace(/\{\{\s*MessageURL\s*\}\}/g, '#')
    .replace(/\{\{\s*UnsubscribeURL\s*\}\}/g, '#')
    .replace(/\{\{\s*TrackView\s*\}\}/g, '')
    .replace(/\{\{\s*TrackLink\s+"([^"]+)"\s*\}\}/g, '$1');
}
