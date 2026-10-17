import { FALLBACK_BRAND_PART_COLOR } from '../brand/defaults';
import { seedNewsletter } from '../seed';
import { renderExport } from '../render';
import { CURRENT_SCHEMA_VERSION, type Newsletter } from '../types';
import { parseLegacyBrandName, parseLegacyStars } from './migrate-v4';
import { normalizeNewsletter } from './normalize-newsletter';

const LEGACY_NAME =
  '<span style="font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#4db8ff;letter-spacing:1px">Cloud</span>' +
  '<span style="font-family:Helvetica,Arial,sans-serif;font-size:20px;color:#A8D8F8;font-weight:700">Lib</span>' +
  '<span style="font-size:20px;font-weight:700;color:#59abf0">.EU</span>';

function v3With(brand: Record<string, unknown>): Newsletter {
  const { globals, blocks } = seedNewsletter();
  return { schemaVersion: 3, globals: { ...globals, brand }, blocks } as unknown as Newsletter;
}

describe('schema v4 brand migration', () => {
  it('turns the styled brand name spans into colored parts', () => {
    expect(parseLegacyBrandName(LEGACY_NAME)).toEqual({
      parts: [
        { text: 'Cloud', color: '#4db8ff' },
        { text: 'Lib', color: '#a8d8f8' },
        { text: '.EU', color: '#59abf0' },
      ],
      size: 'm',
      bold: true,
    });
  });

  it('keeps unstyled names as one part', () => {
    expect(parseLegacyBrandName('<b>Acme &amp; Co</b>')).toEqual({
      parts: [{ text: 'Acme & Co', color: FALLBACK_BRAND_PART_COLOR }],
      size: 'm',
      bold: true,
    });
  });

  it('reads the stars line as symbol and count', () => {
    expect(parseLegacyStars('★ ★ ★ ★ ★ ★')).toEqual({ symbol: '★', count: 6 });
    expect(parseLegacyStars('***')).toEqual({ symbol: '*', count: 3 });
    expect(parseLegacyStars('')).toEqual({ symbol: '★', count: 0 });
  });

  it('migrates a v3 template on load', () => {
    const n = normalizeNewsletter(v3With({ starsText: '✦ ✦', nameHtml: LEGACY_NAME }));
    expect(n.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(n.globals.brand.stars).toEqual({ symbol: '✦', count: 2 });
    expect(n.globals.brand.name.parts.map((p) => p.text).join('')).toBe('CloudLib.EU');
    expect(n.globals.brand).not.toHaveProperty('nameHtml');
  });

  it('hides the stars in header and footer when the count is 0', () => {
    const n = normalizeNewsletter(v3With({ starsText: '', nameHtml: LEGACY_NAME }));
    const { full } = renderExport(n);
    expect(full).not.toContain('brand-stars text-accent');
    expect(full).not.toContain('footer-stars-glyph text-accent');
    expect(full).toMatch(/#a8d8f8[^>]*>Lib<\/span>/i);
  });
});
