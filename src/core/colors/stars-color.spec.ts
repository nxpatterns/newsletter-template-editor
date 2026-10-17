import { renderExport } from '../render';
import { seedNewsletter } from '../seed';
import type { Newsletter } from '../types';
import { resetAllGeneralColors, setBlockColor, setColorMode, setGeneralColor, starsContrastIssues } from './edit';
import { BRAND_COLOR_ROLES, defaultColors, resolveGeneralColors, STANDARD_SETS, type ColorsConfig } from './model';
import { colorSlotsOf } from './slots';

const withColors = (fn: (c: ColorsConfig) => ColorsConfig): Newsletter => {
  const n = seedNewsletter();
  return { ...n, globals: { ...n.globals, colors: fn(n.globals.colors) } };
};

const inlineColor = (html: string, selector: string): string => {
  const el = new DOMParser().parseFromString(html, 'text/html').querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el.style.color;
};

describe('star colors', () => {
  it('top and bottom are general colors of their own that start like the accent', () => {
    expect(BRAND_COLOR_ROLES).toEqual(['starsTop', 'starsBottom']);
    for (const mode of ['dark', 'light'] as const) {
      expect(STANDARD_SETS[mode].starsTop).toBe(STANDARD_SETS[mode].accent);
      expect(STANDARD_SETS[mode].starsBottom).toBe(STANDARD_SETS[mode].accent);
    }
  });

  it('do not follow the accent or each other and are separate per color set', () => {
    let c = setGeneralColor(defaultColors(), 'accent', '#abcdef');
    expect(resolveGeneralColors(c).starsTop).toBe(STANDARD_SETS.dark.starsTop);
    c = setGeneralColor(c, 'starsTop', '#123456');
    expect(resolveGeneralColors(c).starsBottom).toBe(STANDARD_SETS.dark.starsBottom);
    c = setColorMode(c, 'light');
    expect(resolveGeneralColors(c).starsTop).toBe(STANDARD_SETS.light.starsTop);
  });

  it('are no block colors of header or footer any more', () => {
    expect(colorSlotsOf('header').map((s) => s.key)).not.toContain('stars');
    expect(colorSlotsOf('footer').map((s) => s.key)).not.toContain('stars');
  });

  it('survive "reset all" of the Colors tab', () => {
    let c = setGeneralColor(defaultColors(), 'starsTop', '#123456');
    c = setGeneralColor(c, 'starsBottom', '#654321');
    c = setGeneralColor(c, 'link', '#abcdef');
    expect(resetAllGeneralColors(c).dark.general).toEqual({ starsTop: '#123456', starsBottom: '#654321' });
  });

  it('color the top and bottom stars in the export, independent of the accent', () => {
    const n = withColors((c) =>
      setGeneralColor(setGeneralColor(setGeneralColor(c, 'accent', '#abcdef'), 'starsTop', '#123456'), 'starsBottom', '#654321'),
    );
    const { full } = renderExport(n);
    expect(inlineColor(full, '.brand-stars')).toBe('rgb(18, 52, 86)');
    expect(inlineColor(full, '.footer-stars-glyph')).toBe('rgb(101, 67, 33)');
  });

  it('check each star color against its own frame background', () => {
    expect(starsContrastIssues(defaultColors())).toEqual([]);
    expect(starsContrastIssues(setColorMode(defaultColors(), 'light'))).toEqual([]);
    // Light set with a dark header: light top stars are fine there, the same color in the light footer is not.
    let c = setColorMode(defaultColors(), 'light');
    c = setBlockColor(c, 'header', 'background', { hex: '#0c1d33' });
    c = setGeneralColor(setGeneralColor(c, 'starsTop', '#ffb700'), 'starsBottom', '#ffb700');
    const issues = starsContrastIssues(c);
    expect(issues.map((i) => i.frame)).toEqual(['footer']);
    expect(issues[0]).toMatchObject({ fg: '#ffb700', bg: STANDARD_SETS.light.page });
    c = setGeneralColor(c, 'starsBottom', STANDARD_SETS.light.starsBottom);
    expect(starsContrastIssues(c)).toEqual([]);
  });
});
