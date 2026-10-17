import { contrastRatio, makeReadable, TEXT_CONTRAST_MIN } from './contrast';
import {
  overridesOfRole,
  resetBlockColors,
  resolveSlot,
  setBlockColor,
  setColorMode,
  setGeneralColor,
  slotContrastIssue,
} from './edit';
import { defaultColors, normalizeColors, resolveGeneralColors, STANDARD_SETS } from './model';
import { BLOCK_COLOR_SLOTS } from './slots';

const stats = { id: 'b1', type: 'stat-box' };

describe('color levels', () => {
  it('standard colors are the lowest level', () => {
    const c = defaultColors();
    expect(resolveGeneralColors(c).link).toBe(STANDARD_SETS.dark.link);
    expect(resolveSlot(c, 'dark', stats, 'number')).toMatchObject({ hex: STANDARD_SETS.dark.link, source: 'general' });
  });

  it('a general color overrides the standard, a block color overrides the general one', () => {
    let c = setGeneralColor(defaultColors(), 'link', '#112233');
    expect(resolveSlot(c, 'dark', stats, 'number').hex).toBe('#112233');
    c = setBlockColor(c, 'b1', 'number', { hex: '#445566' });
    expect(resolveSlot(c, 'dark', stats, 'number')).toMatchObject({ hex: '#445566', source: 'own' });
  });

  it('a block color linked to a general color follows it', () => {
    let c = setBlockColor(defaultColors(), 'b1', 'number', { role: 'accent' });
    c = setGeneralColor(c, 'accent', '#abcdef');
    expect(resolveSlot(c, 'dark', stats, 'number')).toMatchObject({ hex: '#abcdef', source: 'general', role: 'accent' });
  });

  it('light and dark are separate sets', () => {
    let c = setGeneralColor(defaultColors(), 'head', '#111111');
    c = setColorMode(c, 'light');
    expect(resolveGeneralColors(c).head).toBe(STANDARD_SETS.light.head);
    c = setBlockColor(c, 'b1', 'number', { hex: '#222222' });
    expect(resolveSlot(c, 'dark', stats, 'number').source).toBe('general');
  });
});

describe('changing a general color', () => {
  const base = setBlockColor(defaultColors(), 'b1', 'number', { hex: '#445566' });
  const refs = overridesOfRole(base, 'dark', [stats], 'link');

  it('lists blocks that fixed their own value', () => {
    expect(refs).toEqual([{ target: stats, key: 'number' }]);
  });

  it('keeps individual values when asked to', () => {
    const c = setGeneralColor(base, 'link', '#778899', refs, true);
    expect(resolveSlot(c, 'dark', stats, 'number').hex).toBe('#445566');
  });

  it('applies everywhere when asked to', () => {
    const c = setGeneralColor(base, 'link', '#778899', refs, false);
    expect(resolveSlot(c, 'dark', stats, 'number').hex).toBe('#778899');
  });

  it('resetting a block drops its colors', () => {
    expect(resetBlockColors(base, 'b1').dark.blocks['b1']).toBeUndefined();
  });
});

describe('contrast', () => {
  it('reports pair, cause and values for an unreadable text color', () => {
    const own = setBlockColor(defaultColors(), 'b1', 'label', { hex: '#0c1628' });
    const issue = slotContrastIssue(own, 'dark', stats, 'label');
    expect(issue).toMatchObject({ cause: 'own', onKey: 'box', min: TEXT_CONTRAST_MIN });
    expect(issue!.ratio).toBeLessThan(TEXT_CONTRAST_MIN);
  });

  it('calls a general cause inherited', () => {
    const c = setGeneralColor(defaultColors(), 'dim', '#060e1a');
    expect(slotContrastIssue(c, 'dark', stats, 'label')?.cause).toBe('inherited');
  });

  it('makeReadable reaches the required ratio and keeps readable colors', () => {
    const fixed = makeReadable('#2c4d66', '#060d1a');
    expect(contrastRatio(fixed, '#060d1a')).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN);
    expect(makeReadable('#ffffff', '#000000')).toBe('#ffffff');
    const onLight = makeReadable('#cccccc', '#ffffff');
    expect(contrastRatio(onLight, '#ffffff')).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN);
  });
});

describe('normalizeColors', () => {
  it('repairs garbage and drops colors of removed blocks', () => {
    const c = normalizeColors(
      {
        mode: 'x',
        dark: { general: { link: 'nope', head: '#ABC' }, blocks: { b1: { number: { hex: '#123456' }, x: { hex: 'bad' } }, gone: { a: { role: 'body' } } } },
      },
      ['b1'],
    );
    expect(c.mode).toBe('dark');
    expect(c.dark.general).toEqual({ head: '#aabbcc' });
    expect(c.dark.blocks).toEqual({ b1: { number: { hex: '#123456' } } });
  });

  it('every slot follows a known general color', () => {
    for (const slots of Object.values(BLOCK_COLOR_SLOTS)) {
      expect(new Set(slots.map((s) => s.key)).size).toBe(slots.length);
      for (const s of slots) if (s.on) expect(slots.some((o) => o.key === s.on)).toBe(true);
    }
  });
});
