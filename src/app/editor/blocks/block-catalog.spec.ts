import { createBlock, normalizeNewsletter, renderExport, type Block } from '../../../core';
import { seedNewsletter } from '../../../core/seed';
import { DE } from '../../i18n/catalogs/de';
import { EN } from '../../i18n/catalogs/en';
import { CATALOG_TYPES } from './block-catalog';

/** Guards that block types stay separate: own label, own markup, demos unchanged. */
describe('block catalog', () => {
  for (const [lang, catalog] of [['de', DE], ['en', EN]] as const) {
    it(`gives every catalog type its own ${lang} label and hint`, () => {
      const labels = CATALOG_TYPES.map((type) => catalog[`block.${type}`]);
      for (const type of CATALOG_TYPES) {
        expect(catalog[`block.${type}`], type).toBeTruthy();
        expect(catalog[`block.${type}.hint`], type).toBeTruthy();
      }
      expect(new Set(labels).size).toBe(labels.length);
    });
  }

  it('keeps the pull quote and the testimonial apart in data and markup', () => {
    const render = (b: Block) => {
      const n = seedNewsletter();
      n.blocks = [b];
      return renderExport(n).body;
    };
    const pull = render(createBlock('pull-quote'));
    const testimonial = render(createBlock('testimonial'));
    expect(Object.keys(createBlock('pull-quote')).sort()).toEqual(['id', 'quote', 'type']);
    expect(pull).toContain('pull-quote-bar');
    expect(pull).not.toContain('testimonial');
    expect(testimonial).toContain('testimonial-quote');
    expect(testimonial).not.toContain('pull-quote');
  });

  for (const lang of ['de', 'en'] as const) {
    it(`loads the ${lang} demo with its block types unchanged and all in the catalog`, () => {
      const demo = seedNewsletter(lang);
      const types = demo.blocks.map((b) => b.type);
      const normalized = normalizeNewsletter(structuredClone(demo));
      expect(normalized.blocks.map((b) => b.type)).toEqual(types);
      for (const type of types) expect(CATALOG_TYPES, type).toContain(type);
      for (const b of normalized.blocks.filter((x) => x.type === 'pull-quote')) {
        expect(Object.keys(b).sort()).toEqual(['id', 'quote', 'type']);
      }
    });
  }
});
