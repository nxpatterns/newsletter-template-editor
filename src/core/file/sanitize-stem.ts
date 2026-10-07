/** Default display / stem for CloudLib seed. */
export const DEFAULT_DISPLAY_NAME = 'CloudLib-EU-Example-Newsletter-Template';

const STEM_MAX = 80;

/** Explicit Latin folds (German, Turkish, South-Slavic, common EU). */
const FOLD: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
  æ: 'ae',
  Æ: 'Ae',
  ø: 'oe',
  Ø: 'Oe',
  å: 'aa',
  Å: 'Aa',
  ı: 'i',
  İ: 'I',
  ş: 's',
  Ş: 'S',
  ğ: 'g',
  Ğ: 'G',
  ç: 'c',
  Ç: 'C',
  č: 'c',
  Č: 'C',
  ć: 'c',
  Ć: 'C',
  š: 's',
  Š: 'S',
  ž: 'z',
  Ž: 'Z',
  đ: 'dj',
  Đ: 'Dj',
  ñ: 'n',
  Ñ: 'N',
  ł: 'l',
  Ł: 'L',
};

function shortHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function capitalizeSegment(seg: string): string {
  if (!seg) return seg;
  if (/^[A-Z0-9]{2,4}$/.test(seg)) return seg;
  // Preserve CamelCase brands (CloudLib) — only force Title Case on flat words.
  if (/[a-z]/.test(seg) && /[A-Z]/.test(seg.slice(1))) {
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  }
  return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
}

/**
 * Portable download stem: no spaces, ASCII, Pascal-segments, safe on all OSes.
 * Display names are not mutated — only download names use this.
 */
export function sanitizeFileStem(raw: string | null | undefined): string {
  const original = (raw ?? '').trim();
  if (!original) return 'Newsletter-Template';

  let s = original.normalize('NFKC');
  let out = '';
  for (const ch of s) {
    if (FOLD[ch]) {
      out += FOLD[ch];
      continue;
    }
    out += ch;
  }
  s = out.normalize('NFD').replace(/\p{M}+/gu, '');
  s = s.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!s || !/[A-Za-z0-9]/.test(s)) {
    return `Newsletter-Template-${shortHash(original)}`;
  }

  const parts = s.split('-').filter(Boolean).map(capitalizeSegment);
  let stem = parts.join('-');
  if (stem.length > STEM_MAX) {
    stem = stem.slice(0, STEM_MAX).replace(/-+$/g, '');
  }
  return stem || `Newsletter-Template-${shortHash(original)}`;
}

export function downloadFilename(stemSource: string, ext: string): string {
  const stem = sanitizeFileStem(stemSource);
  const e = ext.replace(/^\./, '');
  return `${stem}.${e}`;
}
