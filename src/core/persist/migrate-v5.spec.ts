import { STANDARD_SETS } from '../colors/model';
import { CURRENT_SCHEMA_VERSION } from '../types';
import { normalizeNewsletter } from './normalize-newsletter';
import { migrateNewsletterV4ToV5 } from './migrate-v5';

const v4 = (g: Record<string, unknown>) => ({ schemaVersion: 4, globals: g, blocks: [] }) as never;

describe('migrate v4 → v5', () => {
  it('turns the six campaign colors into general colors of the dark set', () => {
    const out = migrateNewsletterV4ToV5(
      v4({ pageBgColor: '#111111', contentBgColor: STANDARD_SETS.dark.content, standardColor: '#222222', primaryColor: '#333333', secondaryColor: '#444444', accentColor: '#555555' }),
    ) as unknown as { schemaVersion: number; globals: Record<string, unknown> };
    expect(out.schemaVersion).toBe(5);
    expect(out.globals['pageBgColor']).toBeUndefined();
    expect(out.globals['colors']).toMatchObject({
      mode: 'dark',
      dark: { general: { page: '#111111', body: '#222222', head: '#333333', link: '#444444', accent: '#555555' } },
      light: { general: {} },
    });
    expect((out.globals['colors'] as { dark: { general: object } }).dark.general).not.toHaveProperty('content');
  });

  it('normalizeNewsletter converts old data and old fields under a current version', () => {
    const old = normalizeNewsletter(v4({ pageBgColor: '#111111' }));
    expect(old.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(old.globals.colors.dark.general.page).toBe('#111111');
    const odd = normalizeNewsletter({ schemaVersion: CURRENT_SCHEMA_VERSION, globals: { accentColor: '#555555' }, blocks: [] } as never);
    expect(odd.globals.colors.dark.general.accent).toBe('#555555');
  });

  it('renames the rich-text color tokens in block data, only once', () => {
    const old = {
      schemaVersion: 4,
      globals: {},
      blocks: [
        { id: 'p', type: 'paragraph', body: [{ type: 'paragraph', color: 'primary', children: [{ type: 'text', text: 'x', marks: { color: 'secondary' } }] }] },
        { id: 'g', type: 'greeting', text: 't', useName: false, nameLead: '', size: 'm', color: 'standard' },
      ],
    } as never;
    const n = normalizeNewsletter(old);
    const p = n.blocks[0] as unknown as { body: { color: string; children: { marks: { color: string } }[] }[] };
    expect(p.body[0].color).toBe('head');
    expect(p.body[0].children[0].marks.color).toBe('link');
    expect((n.blocks[1] as unknown as { color: string }).color).toBe('body');
    expect(normalizeNewsletter(n).blocks).toEqual(n.blocks);
  });

  it('data without colors gets the standard set', () => {
    const n = normalizeNewsletter({ schemaVersion: 5, globals: {}, blocks: [] } as never);
    expect(n.globals.colors.mode).toBe('dark');
    expect(n.globals.colors.dark.general).toEqual({});
  });
});
