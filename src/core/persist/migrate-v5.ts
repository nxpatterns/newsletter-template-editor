/**
 * Schema v4 → v5 (alpha, one-shot conversion): the six campaign colors in `globals` become the
 * general colors of the dark set. Values equal to the standard colors are not stored. Everything
 * else (light set, block colors) starts empty.
 */
import { parseHexColor, STANDARD_SETS, type ColorRole, type ColorsConfig } from '../colors/model';

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/** Old field → general color it became. */
export const LEGACY_COLOR_FIELDS: Readonly<Record<string, ColorRole>> = {
  pageBgColor: 'page',
  contentBgColor: 'content',
  standardColor: 'body',
  primaryColor: 'head',
  secondaryColor: 'link',
  accentColor: 'accent',
};

export const hasLegacyColors = (globals: unknown): boolean =>
  isObj(globals) && Object.keys(LEGACY_COLOR_FIELDS).some((k) => k in globals);

/** Rich-text color tokens renamed with the color model: standard→body, primary→head, secondary→link. */
const TOKEN_V4: Readonly<Record<string, string>> = { standard: 'body', primary: 'head', secondary: 'link' };

/** Every `color` token in block data (paragraph marks, paragraph colors, greeting color), in one pass. */
function renameTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(renameTokens);
  if (!isObj(value)) return value;
  const out: Json = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = k === 'color' && typeof v === 'string' && v in TOKEN_V4 ? TOKEN_V4[v] : renameTokens(v);
  }
  return out;
}

export function migrateNewsletterV4ToV5<T>(n: T): T {
  if (!isObj(n) || !isObj(n['globals'])) return n;
  const { globals } = n;
  const rest: Json = { ...globals };
  const general: Partial<Record<ColorRole, string>> = {};
  for (const [field, role] of Object.entries(LEGACY_COLOR_FIELDS)) {
    const hex = parseHexColor(globals[field]);
    if (hex && hex !== STANDARD_SETS.dark[role]) general[role] = hex;
    delete rest[field];
  }
  const existing = isObj(globals['colors']) ? (globals['colors'] as unknown as ColorsConfig) : null;
  const colors: ColorsConfig = existing ?? {
    mode: 'dark',
    dark: { general, blocks: {} },
    light: { general: {}, blocks: {} },
  };
  // Color tokens only change with the schema bump; data that already is v5 (seeds) keeps its tokens.
  const blocks = n['schemaVersion'] === 5 ? n['blocks'] : renameTokens(n['blocks']);
  return { ...n, globals: { ...rest, colors }, blocks, schemaVersion: 5 } as T;
}
