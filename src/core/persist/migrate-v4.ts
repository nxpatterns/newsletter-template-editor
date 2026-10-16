/**
 * Schema v3 → v4 (alpha, one-shot conversion): the brand name stops being HTML and the
 * stars line stops being free text. normalizeBrand fills and validates the result for every version.
 */
import { FALLBACK_BRAND_PART_COLOR } from '../brand/defaults';
import { BRAND_STAR_MAX, type BrandName, type BrandStars } from '../types';

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

const FALLBACK_NAME_COLOR = FALLBACK_BRAND_PART_COLOR;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

const plainText = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, ''));

/** "★ ★ ★ ★ ★ ★" → six ★; empty → hidden. The first symbol decides, the count is capped. */
export function parseLegacyStars(text: unknown): BrandStars {
  const symbols = Array.from(typeof text === 'string' ? text : '').filter((c) => c.trim());
  if (!symbols.length) return { symbol: '★', count: 0 };
  return { symbol: symbols[0], count: Math.min(symbols.length, BRAND_STAR_MAX) };
}

/** One part per styled span (its color kept); otherwise the plain text becomes one part. */
export function parseLegacyBrandName(html: unknown): BrandName {
  const src = typeof html === 'string' ? html : '';
  const parts: BrandName['parts'] = [];
  let firstStyle = '';
  for (const m of src.matchAll(/<span\b[^>]*?style\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi)) {
    const text = plainText(m[2]);
    if (!text) continue;
    if (!firstStyle) firstStyle = m[1];
    const color = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8})/i.exec(m[1])?.[1] ?? FALLBACK_NAME_COLOR;
    parts.push({ text, color: color.toLowerCase() });
  }
  if (!parts.length) {
    const text = plainText(src).trim();
    if (text) parts.push({ text, color: FALLBACK_NAME_COLOR });
  }
  const px = Number(/font-size\s*:\s*(\d+)px/i.exec(firstStyle)?.[1] ?? 20);
  const bold = firstStyle
    ? /font-weight\s*:\s*(bold|[6-9]00)/i.test(firstStyle)
    : /<(b|strong)\b/i.test(src) || !src;
  return { parts, size: px <= 17 ? 's' : px >= 23 ? 'l' : 'm', bold };
}

export function migrateNewsletterV3ToV4<T>(n: T): T {
  if (!isObj(n) || !isObj(n['globals'])) return n;
  const globals = n['globals'];
  const brand = isObj(globals['brand']) ? globals['brand'] : {};
  const { starsText, nameHtml, ...rest } = brand;
  return {
    ...n,
    globals: {
      ...globals,
      brand: { ...rest, stars: parseLegacyStars(starsText), name: parseLegacyBrandName(nameHtml) },
    },
    schemaVersion: 4,
  } as T;
}
