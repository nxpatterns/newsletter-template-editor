import { paragraphEditorSurfaceCss, renderPreview } from '../render';
import { applyLinkOnDoc } from '../richtext';
import { seedNewsletter } from '../seed';
import { createBlock, type Block } from '../types';
import { effectiveSlotColors, setBlockColor, setColorMode, setGeneralColor } from './edit';
import { COLOR_MODES, defaultColors, STANDARD_SETS, type ColorsConfig } from './model';
import { BLOCK_COLOR_SLOTS } from './slots';

const BLOCK_TYPES = Object.keys(BLOCK_COLOR_SLOTS).filter((t) => t !== 'header' && t !== 'footer') as Block['type'][];

/** Distinct own color per slot, so a wrong source shows up as a wrong value. */
const ownHex = (i: number) => `#${(0x102030 + i * 0x010203).toString(16).padStart(6, '0')}`;

describe('effective block colors (one source for preview and editor)', () => {
  it('covers all 18 block types and the frame', () => {
    expect(BLOCK_TYPES.length).toBe(18);
  });

  for (const mode of COLOR_MODES) {
    describe(`${mode} set`, () => {
      const base = setColorMode(defaultColors(), mode);

      for (const type of [...BLOCK_TYPES, 'header', 'footer']) {
        const target = { id: type === 'header' || type === 'footer' ? type : `b-${type}`, type };
        const slots = BLOCK_COLOR_SLOTS[type];

        it(`${type}: level 1 is the standard color of each slot`, () => {
          const eff = effectiveSlotColors(base, target);
          expect(Object.keys(eff)).toEqual(slots.map((s) => s.key));
          for (const s of slots) expect(eff[s.key], s.key).toBe(STANDARD_SETS[mode][s.role]);
        });

        it(`${type}: level 2 (general colors) overrides level 1`, () => {
          let c: ColorsConfig = base;
          for (const s of slots) c = setGeneralColor(c, s.role, '#a1b2c3');
          const eff = effectiveSlotColors(c, target);
          for (const s of slots) expect(eff[s.key], s.key).toBe('#a1b2c3');
        });

        it(`${type}: level 3 (own color or link) overrides level 2, only in its own set`, () => {
          let c: ColorsConfig = setGeneralColor(base, 'head', '#0c0d0e');
          slots.forEach((s, i) => {
            c = setBlockColor(c, target.id, s.key, i === 0 ? { role: 'head' } : { hex: ownHex(i) });
          });
          const eff = effectiveSlotColors(c, target);
          slots.forEach((s, i) => expect(eff[s.key], s.key).toBe(i === 0 ? '#0c0d0e' : ownHex(i)));
          const other = mode === 'dark' ? 'light' : 'dark';
          const otherEff = effectiveSlotColors(c, target, other);
          for (const s of slots) expect(otherEff[s.key], `${other} ${s.key}`).toBe(STANDARD_SETS[other][s.role]);
        });
      }
    });
  }
});

/** Blocks of one type in the variants that show every colored part (some parts depend on content). */
function variantsOf(type: Block['type']): Block[] {
  const fresh = createBlock(type);
  const seeded = seedNewsletter().blocks.filter((b) => b.type === type);
  if (fresh.type === 'divider') {
    return (['thin', 'two-tone', 'ornament', 'glow'] as const).map((style) => ({ ...fresh, style }));
  }
  if (fresh.type === 'paragraph') return [{ ...fresh, body: applyLinkOnDoc(fresh.body, 0, 4, 'https://example.com') }];
  if (fresh.type === 'image') return [{ ...fresh, src: 'https://example.com/a.png', caption: 'Caption' }];
  return [fresh, ...seeded];
}

describe('the preview draws every block color where its slot points', () => {
  for (const type of BLOCK_TYPES) {
    it(`${type}: each slot selector exists in the block and carries the effective color`, () => {
      const slots = BLOCK_COLOR_SLOTS[type];
      const found = new Set<string>();
      for (const block of variantsOf(type)) {
        const n = seedNewsletter();
        n.blocks = [block];
        let colors = setColorMode(defaultColors(), 'light');
        slots.forEach((s, i) => (colors = setBlockColor(colors, block.id, s.key, { hex: ownHex(i + 1) })));
        n.globals = { ...n.globals, colors };

        const html = renderPreview(n);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const eff = effectiveSlotColors(colors, { id: block.id, type });
        const scope = `cb-${block.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        for (const s of slots) {
          for (const c of s.css) {
            if (doc.querySelector(`.${scope} ${c.sel}, ${c.sel}.${scope}`)) found.add(`${s.key}: ${c.sel}`);
            expect(html, `${s.key} ${c.sel}`).toContain(`.${scope} ${c.sel}, ${c.sel}.${scope} { ${c.prop}: ${eff[s.key]}`);
          }
        }
      }
      const missing = slots.flatMap((s) => s.css.map((c) => `${s.key}: ${c.sel}`)).filter((k) => !found.has(k));
      expect(missing).toEqual([]);
    });
  }
});

describe('paragraph editor surface', () => {
  it('uses the block background, text and link colors and keeps inline marks general', () => {
    let c = setColorMode(defaultColors(), 'light');
    c = setBlockColor(c, 'p1', 'background', { hex: '#0c1d33' });
    c = setBlockColor(c, 'p1', 'text', { hex: '#ffffff' });
    c = setBlockColor(c, 'p1', 'link', { hex: '#ff8800' });
    const g = { ...seedNewsletter().globals, colors: c };
    const css = paragraphEditorSurfaceCss(g, { id: 'p1', type: 'paragraph' });
    expect(css).toContain('--email-content: #0c1d33;');
    expect(css).toContain('--email-text: #ffffff;');
    expect(css).toContain('--email-link: #ff8800;');
    expect(css).toContain(`--email-mark-link: ${STANDARD_SETS.light.link};`);
    expect(css).toContain(`--email-body: ${STANDARD_SETS.light.body};`);
  });

  it('falls back to the general colors without a block', () => {
    const g = { ...seedNewsletter().globals, colors: setColorMode(defaultColors(), 'light') };
    const css = paragraphEditorSurfaceCss(g);
    expect(css).toContain(`--email-content: ${STANDARD_SETS.light.content};`);
    expect(css).toContain(`--email-text: ${STANDARD_SETS.light.body};`);
  });
});
