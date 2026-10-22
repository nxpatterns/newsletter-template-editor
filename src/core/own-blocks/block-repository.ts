import {
  openDb,
  STORE_BLOCK_DRAFTS,
  STORE_BLOCK_VERSIONS,
  STORE_OWN_BLOCKS,
  txDone,
} from '../persist/idb-docs';
import type { BlockDraft, BlockLibraryChange, OwnBlock, OwnBlockVersion } from './model';

/**
 * Where own blocks, their versions and drafts live. Today: this browser (IndexedDB), in the same
 * database as the templates. Later a cloud implementation can replace it without touching
 * components. Changes come from the pure operations in `operations.ts`.
 */
export interface BlockRepository {
  /** Last changed first. */
  listBlocks(): Promise<OwnBlock[]>;
  getBlock(id: string): Promise<OwnBlock | null>;
  /** Oldest first. */
  listVersions(blockId: string): Promise<OwnBlockVersion[]>;
  getVersion(id: string): Promise<OwnBlockVersion | null>;
  /** Last changed first, standalone drafts included. */
  listDrafts(): Promise<BlockDraft[]>;
  getDraft(id: string): Promise<BlockDraft | null>;
  draftForBlock(blockId: string): Promise<BlockDraft | null>;
  /** Writes the whole change or nothing. */
  apply(change: BlockLibraryChange): Promise<void>;
}

function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function readStore<T>(store: string, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return request<T>(run(db.transaction(store, 'readonly').objectStore(store)));
}

const newestFirst = <T extends { updatedAt: string }>(rows: T[]) =>
  rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

export const indexedDbBlockRepository: BlockRepository = {
  async listBlocks() {
    return newestFirst(await readStore<OwnBlock[]>(STORE_OWN_BLOCKS, (s) => s.getAll()));
  },
  async getBlock(id) {
    return (await readStore<OwnBlock | undefined>(STORE_OWN_BLOCKS, (s) => s.get(id))) ?? null;
  },
  async listVersions(blockId) {
    const rows = await readStore<OwnBlockVersion[]>(STORE_BLOCK_VERSIONS, (s) => s.index('blockId').getAll(blockId));
    return rows.sort((a, b) => a.number - b.number);
  },
  async getVersion(id) {
    return (await readStore<OwnBlockVersion | undefined>(STORE_BLOCK_VERSIONS, (s) => s.get(id))) ?? null;
  },
  async listDrafts() {
    return newestFirst(await readStore<BlockDraft[]>(STORE_BLOCK_DRAFTS, (s) => s.getAll()));
  },
  async getDraft(id) {
    return (await readStore<BlockDraft | undefined>(STORE_BLOCK_DRAFTS, (s) => s.get(id))) ?? null;
  },
  async draftForBlock(blockId) {
    return (await readStore<BlockDraft | undefined>(STORE_BLOCK_DRAFTS, (s) => s.index('blockId').get(blockId))) ?? null;
  },
  async apply(change) {
    const db = await openDb();
    const tx = db.transaction([STORE_OWN_BLOCKS, STORE_BLOCK_VERSIONS, STORE_BLOCK_DRAFTS], 'readwrite');
    const blocks = tx.objectStore(STORE_OWN_BLOCKS);
    const versions = tx.objectStore(STORE_BLOCK_VERSIONS);
    const drafts = tx.objectStore(STORE_BLOCK_DRAFTS);
    const done = txDone(tx);
    try {
      change.deleteBlockIds?.forEach((id) => blocks.delete(id));
      change.deleteVersionIds?.forEach((id) => versions.delete(id));
      change.deleteDraftIds?.forEach((id) => drafts.delete(id));
      change.putBlocks?.forEach((row) => blocks.put(row));
      change.putVersions?.forEach((row) => versions.put(row));
      change.putDrafts?.forEach((row) => drafts.put(row));
    } catch (error) {
      // A bad row throws right away; without the abort the rows before it would still be written.
      // Waiting for the abort means the rollback is finished when the caller sees the error.
      tx.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
  },
};
