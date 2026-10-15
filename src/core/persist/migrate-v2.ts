/**
 * Schema v1 → v2: color and size tokens renamed (alpha, one-shot conversion).
 *
 * Colors: body→standard, heading→primary, accent→secondary, gold→accent, dim stays.
 * Sizes:  caption→xs, fine→s, body→m, lead→l, callout→xl.
 *
 * Every mapping runs as a single pass (lookup table), never as chained
 * search/replace: `accent→secondary` and `gold→accent` would otherwise collide.
 */

const COLOR_V1: Readonly<Record<string, string>> = {
  body: 'standard',
  heading: 'primary',
  accent: 'secondary',
  gold: 'accent',
  dim: 'dim',
};

const SIZE_V1: Readonly<Record<string, string>> = {
  caption: 'xs',
  fine: 's',
  body: 'm',
  lead: 'l',
  callout: 'xl',
};

const GLOBALS_V1: Readonly<Record<string, string>> = {
  accentColor: 'secondaryColor',
  goldColor: 'accentColor',
  headingColor: 'primaryColor',
  bodyTextColor: 'standardColor',
};

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

function mapToken(table: Readonly<Record<string, string>>, v: unknown): unknown {
  return typeof v === 'string' && v in table ? table[v] : v;
}

/** v1 rich doc (paragraph nodes with marks) → v2 tokens. Unknown shapes pass through. */
export function migrateRichDocV1ToV2(doc: unknown): unknown {
  if (!Array.isArray(doc)) return doc;
  return doc.map((node) => {
    if (!isObj(node)) return node;
    const next: Json = { ...node };
    if ('color' in next) next['color'] = mapToken(COLOR_V1, next['color']);
    if (Array.isArray(node['children'])) {
      next['children'] = node['children'].map((child) => {
        if (!isObj(child) || !isObj(child['marks'])) return child;
        const marks: Json = { ...child['marks'] };
        if ('color' in marks) marks['color'] = mapToken(COLOR_V1, marks['color']);
        if ('size' in marks) marks['size'] = mapToken(SIZE_V1, marks['size']);
        return { ...child, marks };
      });
    }
    return next;
  });
}

/** Legacy paragraph HTML strings: rewrite v1 class names / data attributes. */
export function migrateRichHtmlV1ToV2(html: string): string {
  return html
    .replace(/(?<![\w-])text-(body|heading|accent|gold)\b(?!-)/g, (_, t: string) => `text-${COLOR_V1[t]}`)
    .replace(/rt-size-(caption|fine|body|lead|callout)\b/g, (_, t: string) => `rt-size-${SIZE_V1[t]}`)
    .replace(/data-rt-color=(["'])(body|heading|accent|gold|dim)\1/g, (_, q: string, t: string) => `data-rt-color=${q}${COLOR_V1[t]}${q}`)
    .replace(/data-rt-size=(["'])(caption|fine|body|lead|callout)\1/g, (_, q: string, t: string) => `data-rt-size=${q}${SIZE_V1[t]}${q}`);
}

function migrateGlobals(globals: unknown): unknown {
  if (!isObj(globals)) return globals;
  const next: Json = {};
  for (const [k, v] of Object.entries(globals)) next[GLOBALS_V1[k] ?? k] = v;
  return next;
}

function migrateBlock(block: unknown): unknown {
  if (!isObj(block)) return block;
  if (block['type'] === 'paragraph') {
    const next: Json = { ...block };
    for (const key of ['body', 'html']) {
      const v = next[key];
      if (Array.isArray(v)) next[key] = migrateRichDocV1ToV2(v);
      else if (typeof v === 'string') next[key] = migrateRichHtmlV1ToV2(v);
    }
    return next;
  }
  if (block['type'] === 'divider' && block['style'] === 'accent-double') {
    return { ...block, style: 'secondary-double' };
  }
  return block;
}

/** Whole newsletter v1 → v2 (globals keys, paragraph tokens, divider style). */
export function migrateNewsletterV1ToV2<T>(n: T): T {
  if (!isObj(n)) return n;
  return {
    ...n,
    globals: migrateGlobals(n['globals']),
    blocks: Array.isArray(n['blocks']) ? n['blocks'].map(migrateBlock) : n['blocks'],
    schemaVersion: 2,
  } as T;
}
