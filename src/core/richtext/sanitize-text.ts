/**
 * Text hygiene for paste/save and seed migration.
 * Strips invisible / bidi / format junk and normalizes fancy punctuation.
 */

/** Code points always removed (zero-width, BOM, soft hyphen, bidi isolates, etc.). */
const INVISIBLE_RE =
  /[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/g;

/** Characters that are suspicious for “show AI junk” mode (kept until cleaned). */
export const SUSPICIOUS_CHAR_RE =
  /[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u2010-\u2015\u2212\u00A0\u202F\u205F]/g;

export function isSuspiciousChar(ch: string): boolean {
  if (!ch) return false;
  SUSPICIOUS_CHAR_RE.lastIndex = 0;
  return SUSPICIOUS_CHAR_RE.test(ch);
}

/**
 * Soft normalize for live editor storage: NFC only + drop NULs.
 * Keeps AI/invisible watermarks so “AI chars” can highlight them until Clear.
 */
export function preserveEditorText(input: string): string {
  return input.normalize('NFC').replace(/\u0000/g, '');
}

/** Full hygiene: strip invisibles, dashes, spaces. Use on Clear + email export. */
export function cleanPlainText(input: string): string {
  let s = input.normalize('NFC');
  s = s.replace(INVISIBLE_RE, '');
  // Spaces
  s = s.replace(/[\u00A0\u202F\u205F]/g, ' ');
  // Dashes / minus → ASCII hyphen
  s = s.replace(/[\u2010-\u2015\u2212]/g, '-');
  // Fancy quotes → ASCII
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  // Ellipsis
  s = s.replace(/\u2026/g, '...');
  // Collapse runs of spaces (keep newlines for soft structure before paragraph split)
  s = s.replace(/[^\S\n\r]+/g, ' ');
  return s;
}

/** Sample paste payload with representative watermark / invisible code points. */
export const AI_WATERMARK_SAMPLE =
  'Short AI sample with watermarks: ' +
  'zero\u200Bwidth\u200B, ' +
  'BOM\uFEFF here, ' +
  'soft\u00ADhyphen, ' +
  'nbsp\u00A0space, ' +
  'em\u2014dash, ' +
  'en\u2013dash, ' +
  'fancy\u201Cquotes\u201D, ' +
  'bidi\u202Eforce, ' +
  'join\u2060er, ' +
  'math\u205Fspace.';

export function countSuspiciousChars(input: string): number {
  const m = input.match(SUSPICIOUS_CHAR_RE);
  return m ? m.length : 0;
}

/** Wrap suspicious characters for editor highlight mode (escaped HTML fragment). */
export function highlightSuspiciousHtml(plain: string, escapeHtml: (s: string) => string): string {
  let out = '';
  for (const ch of plain) {
    const esc = escapeHtml(ch);
    if (isSuspiciousChar(ch)) {
      out += `<span class="rt-suspicious" data-suspicious="1">${esc === ' ' ? '&nbsp;' : esc}</span>`;
    } else {
      out += esc === '\n' ? '<br>' : esc;
    }
  }
  return out;
}
