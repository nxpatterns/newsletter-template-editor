/**
 * Schema v2 → v3 (alpha, one-shot conversion): divider style `secondary-double` is now `two-tone`.
 * The new divider `background` token is filled in by normalizeBlocks for every version.
 */

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

function migrateBlock(block: unknown): unknown {
  if (isObj(block) && block['type'] === 'divider' && block['style'] === 'secondary-double') {
    return { ...block, style: 'two-tone' };
  }
  return block;
}

export function migrateNewsletterV2ToV3<T>(n: T): T {
  if (!isObj(n)) return n;
  return {
    ...n,
    blocks: Array.isArray(n['blocks']) ? n['blocks'].map(migrateBlock) : n['blocks'],
    schemaVersion: 3,
  } as T;
}
