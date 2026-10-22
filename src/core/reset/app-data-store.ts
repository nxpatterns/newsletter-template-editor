import type { BlockDraft, OwnBlock, OwnBlockVersion } from '../own-blocks/model';
import {
  HIDDEN_DEMOS_KEY,
  openDb,
  RECOVERY_KEY,
  STORE_BLOCK_DRAFTS,
  STORE_BLOCK_VERSIONS,
  STORE_LIBRARY,
  STORE_OWN_BLOCKS,
  STORE_RECOVERY,
  txDone,
  type LibraryEntry,
  type RecoveryDoc,
} from '../persist/idb-docs';
import type { BackupData } from './backup-file';
import type { ResetInventory, ResetKind } from './reset-kinds';

/** What the stored kinds hold; view settings live in localStorage and are counted by the app. */
export type StoredInventory = Omit<ResetInventory, 'viewSettings'>;

/** How many rows a restore added; rows whose id already exists are kept as they are. */
export interface RestoreResult {
  templates: number;
  ownBlocks: number;
  blockDrafts: number;
  workingDraft: boolean;
}

/**
 * Templates, own blocks, block drafts and the working draft as one whole, for the reset dialog:
 * count, save as a file, delete the checked kinds, open a saved file again.
 */
export interface AppDataStore {
  inventory(): Promise<StoredInventory>;
  /** The stored rows of these kinds; view settings are not part of it. */
  read(kinds: readonly ResetKind[]): Promise<BackupData>;
  /** Deletes the checked kinds in one transaction; the kinds are independent (decision 65). */
  clear(kinds: readonly ResetKind[]): Promise<void>;
  /** Adds the rows of a backup that do not exist yet, in one transaction. */
  restore(data: BackupData): Promise<RestoreResult>;
}

const ALL_STORES = [STORE_LIBRARY, STORE_RECOVERY, STORE_OWN_BLOCKS, STORE_BLOCK_VERSIONS, STORE_BLOCK_DRAFTS];

function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/** Everything the reset needs to know, read in one snapshot. */
async function readAll(): Promise<{
  templates: LibraryEntry[];
  hiddenDemos: string[];
  ownBlocks: OwnBlock[];
  blockVersions: OwnBlockVersion[];
  blockDrafts: BlockDraft[];
  workingDraft: RecoveryDoc | null;
}> {
  const db = await openDb();
  const tx = db.transaction(ALL_STORES, 'readonly');
  const [templates, hidden, ownBlocks, blockVersions, blockDrafts, workingDraft] = await Promise.all([
    request<LibraryEntry[]>(tx.objectStore(STORE_LIBRARY).getAll()),
    request<{ langs?: unknown } | undefined>(tx.objectStore(STORE_RECOVERY).get(HIDDEN_DEMOS_KEY)),
    request<OwnBlock[]>(tx.objectStore(STORE_OWN_BLOCKS).getAll()),
    request<OwnBlockVersion[]>(tx.objectStore(STORE_BLOCK_VERSIONS).getAll()),
    request<BlockDraft[]>(tx.objectStore(STORE_BLOCK_DRAFTS).getAll()),
    request<RecoveryDoc | undefined>(tx.objectStore(STORE_RECOVERY).get(RECOVERY_KEY)),
  ]);
  const hiddenDemos = Array.isArray(hidden?.langs) ? hidden.langs.filter((l): l is string => typeof l === 'string') : [];
  return { templates, hiddenDemos, ownBlocks, blockVersions, blockDrafts, workingDraft: workingDraft ?? null };
}

export const indexedDbAppDataStore: AppDataStore = {
  async inventory() {
    const all = await readAll();
    const oldest = all.blockDrafts.reduce<string | null>(
      (min, d) => (min === null || d.updatedAt < min ? d.updatedAt : min),
      null,
    );
    const work = all.workingDraft;
    return {
      templates: all.templates.length,
      hiddenDemos: all.hiddenDemos.length,
      ownBlocks: all.ownBlocks.length,
      blockDrafts: all.blockDrafts.length,
      oldestDraftAt: oldest,
      workingDraft: work
        ? { displayName: work.displayName, dirty: work.dirty, savedAt: work.savedAt, libraryId: work.libraryId }
        : null,
    };
  },

  async read(kinds) {
    const all = await readAll();
    const data: BackupData = {};
    if (kinds.includes('templates')) data.templates = all.templates;
    if (kinds.includes('ownBlocks')) {
      data.ownBlocks = all.ownBlocks;
      data.blockVersions = all.blockVersions;
    }
    if (kinds.includes('blockDrafts')) data.blockDrafts = all.blockDrafts;
    if (kinds.includes('workingDraft')) data.workingDraft = all.workingDraft;
    return data;
  },

  async clear(kinds) {
    const has = (k: ResetKind) => kinds.includes(k);
    const before = await readAll();
    const db = await openDb();
    const tx = db.transaction(ALL_STORES, 'readwrite');
    const done = txDone(tx);
    const recovery = tx.objectStore(STORE_RECOVERY);
    if (has('templates')) {
      tx.objectStore(STORE_LIBRARY).clear();
      // The deleted demos come back with the templates.
      recovery.delete(HIDDEN_DEMOS_KEY);
    }
    if (has('workingDraft')) {
      recovery.delete(RECOVERY_KEY);
    } else if (has('templates') && before.workingDraft?.libraryId) {
      // The kept work no longer has a saved template: it shows as unsaved.
      recovery.put({ ...before.workingDraft, libraryId: null, dirty: true });
    }
    if (has('ownBlocks')) {
      tx.objectStore(STORE_OWN_BLOCKS).clear();
      tx.objectStore(STORE_BLOCK_VERSIONS).clear();
      if (!has('blockDrafts')) {
        // Kept drafts of deleted blocks stay as standalone drafts (decision 65).
        const drafts = tx.objectStore(STORE_BLOCK_DRAFTS);
        before.blockDrafts.filter((d) => d.blockId !== null).forEach((d) => drafts.put({ ...d, blockId: null }));
      }
    }
    if (has('blockDrafts')) tx.objectStore(STORE_BLOCK_DRAFTS).clear();
    await done;
  },

  async restore(data) {
    const before = await readAll();
    const templateIds = new Set(before.templates.map((t) => t.id));
    const blockIds = new Set(before.ownBlocks.map((b) => b.id));
    const versionIds = new Set(before.blockVersions.map((v) => v.id));
    const draftIds = new Set(before.blockDrafts.map((d) => d.id));
    const draftedBlocks = new Set(before.blockDrafts.map((d) => d.blockId).filter((id): id is string => !!id));

    const templates = (data.templates ?? []).filter((t) => !templateIds.has(t.id));
    templates.forEach((t) => templateIds.add(t.id));
    const blocks = (data.ownBlocks ?? []).filter((b) => !blockIds.has(b.id));
    blocks.forEach((b) => blockIds.add(b.id));
    const versions = (data.blockVersions ?? []).filter((v) => !versionIds.has(v.id) && blockIds.has(v.blockId));
    const drafts = (data.blockDrafts ?? [])
      .filter((d) => !draftIds.has(d.id))
      .map((d) => {
        // At most one draft per block; a draft without its block stands alone.
        const keepLink = d.blockId !== null && blockIds.has(d.blockId) && !draftedBlocks.has(d.blockId);
        if (keepLink && d.blockId) draftedBlocks.add(d.blockId);
        return keepLink ? d : { ...d, blockId: null };
      });
    const work = !before.workingDraft && data.workingDraft ? data.workingDraft : null;

    const db = await openDb();
    const tx = db.transaction(ALL_STORES, 'readwrite');
    const done = txDone(tx);
    templates.forEach((t) => tx.objectStore(STORE_LIBRARY).put(t));
    blocks.forEach((b) => tx.objectStore(STORE_OWN_BLOCKS).put(b));
    versions.forEach((v) => tx.objectStore(STORE_BLOCK_VERSIONS).put(v));
    drafts.forEach((d) => tx.objectStore(STORE_BLOCK_DRAFTS).put(d));
    if (work) {
      const bound = work.libraryId !== null && templateIds.has(work.libraryId);
      tx.objectStore(STORE_RECOVERY).put({
        ...work,
        key: RECOVERY_KEY,
        libraryId: bound ? work.libraryId : null,
        dirty: bound ? work.dirty : true,
      });
    }
    await done;
    return { templates: templates.length, ownBlocks: blocks.length, blockDrafts: drafts.length, workingDraft: !!work };
  },
};
