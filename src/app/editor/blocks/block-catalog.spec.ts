import { createBlock, normalizeNewsletter, renderExport, type Block } from '../../../core';
import { seedNewsletter } from '../../../core/seed';
import { CATALOG_TYPES } from './block-catalog';

/** Guards that block types stay separate: fixed count, own markup, demos unchanged. */
describe('block catalog', () => {
  it('offers exactly 18 distinct block types', () => {
    expect(CATALOG_TYPES.length).toBe(18);
    expect(new Set(CATALOG_TYPES).size).toBe(CATALOG_TYPES.length);
  });

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
