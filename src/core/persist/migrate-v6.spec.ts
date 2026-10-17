import { STANDARD_SETS } from '../colors/model';
import { CURRENT_SCHEMA_VERSION } from '../types';
import { migrateNewsletterV5ToV6 } from './migrate-v6';
import { normalizeNewsletter } from './normalize-newsletter';

type Set = { general: Record<string, string>; blocks: Record<string, Record<string, unknown>> };
const doc = (version: number, dark: Set, light: Set = { general: {}, blocks: {} }) =>
  ({ schemaVersion: version, globals: { colors: { mode: 'dark', dark, light } }, blocks: [] }) as never;
const colorsOf = (n: unknown) => (n as { globals: { colors: { dark: Set; light: Set } } }).globals.colors;

describe('migrate v5 → v6', () => {
  it('keeps the look: a changed accent becomes both star colors', () => {
    const out = migrateNewsletterV5ToV6(doc(5, { general: { accent: '#abcdef' }, blocks: {} }));
    expect((out as { schemaVersion: number }).schemaVersion).toBe(6);
    expect(colorsOf(out).dark.general).toEqual({ accent: '#abcdef', starsTop: '#abcdef', starsBottom: '#abcdef' });
    expect(colorsOf(out).light.general).toEqual({});
  });

  it('a star color set in header or footer goes to its own star color and leaves the block colors', () => {
    const out = migrateNewsletterV5ToV6(
      doc(5, {
        general: { accent: '#abcdef' },
        blocks: { header: { stars: { hex: '#112233' }, background: { hex: '#000000' } }, footer: { stars: { hex: '#445566' } } },
      }),
    );
    expect(colorsOf(out).dark.general).toMatchObject({ starsTop: '#112233', starsBottom: '#445566' });
    expect(colorsOf(out).dark.blocks).toEqual({ header: { background: { hex: '#000000' } } });
  });

  it('a star color linked to another general color takes that color', () => {
    const out = migrateNewsletterV5ToV6(doc(5, { general: {}, blocks: { footer: { stars: { role: 'link' } } } }));
    expect(colorsOf(out).dark.general).toEqual({ starsBottom: STANDARD_SETS.dark.link });
    expect(colorsOf(out).dark.blocks).toEqual({});
  });

  it('an early v6 draft with one shared star color gives it to top and bottom', () => {
    const n = normalizeNewsletter(doc(6, { general: { stars: '#ffb700' }, blocks: {} }));
    expect(n.globals.colors.dark.general).toEqual({ starsTop: '#ffb700', starsBottom: '#ffb700' });
  });

  it('standard data stays standard, and runs only once through normalizeNewsletter', () => {
    const n = normalizeNewsletter(doc(5, { general: {}, blocks: {} }));
    expect(n.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(n.globals.colors.dark.general).toEqual({});
    const changed = { ...n, globals: { ...n.globals, colors: { ...n.globals.colors, dark: { general: { accent: '#abcdef' }, blocks: {} } } } };
    expect(normalizeNewsletter(changed).globals.colors.dark.general).toEqual({ accent: '#abcdef' });
  });
});
