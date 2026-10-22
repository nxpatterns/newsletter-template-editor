import { isUuidV7 } from '../id/uuid-v7';
import { CURRENT_SCHEMA_VERSION, type Newsletter } from '../types';
import { STORAGE_KEY, type StoredEnvelope, loadNewsletter } from './storage';
import { normalizeNewsletter } from './normalize-newsletter';

const DB_NAME = 'nte-docs';
/** v2: stores for own blocks, their versions and drafts (block editor); templates with pre-UUIDv7 ids are dropped (beta). */
const DB_VERSION = 2;
export const STORE_LIBRARY = 'library';
export const STORE_RECOVERY = 'recovery';
export const STORE_OWN_BLOCKS = 'ownBlocks';
export const STORE_BLOCK_VERSIONS = 'blockVersions';
export const STORE_BLOCK_DRAFTS = 'blockDrafts';
export const RECOVERY_KEY = 'current';

export interface LibraryEntry {
  id: string;
  displayName: string;
  updatedAt: string;
  newsletter: Newsletter;
  /** When it was pinned to the start page tiles; absent when not pinned. */
  pinnedAt?: string;
  /** Filled from the account at the first cloud upload; absent or null locally. */
  tenantId?: string | null;
  ownerId?: string | null;
}

export interface RecoveryDoc {
  key: typeof RECOVERY_KEY;
  displayName: string;
  libraryId: string | null;
  dirty: boolean;
  newsletter: Newsletter;
  savedAt: string;
  schemaVersion: number;
}

export interface ProjectFileEnvelope {
  kind: 'nte-project';
  schemaVersion: number;
  displayName: string;
  libraryId: string | null;
  newsletter: Newsletter;
  exportedAt: string;
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
        db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
        db.createObjectStore(STORE_RECOVERY, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_OWN_BLOCKS)) {
        db.createObjectStore(STORE_OWN_BLOCKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOCK_VERSIONS)) {
        db.createObjectStore(STORE_BLOCK_VERSIONS, { keyPath: 'id' }).createIndex('blockId', 'blockId');
      }
      if (!db.objectStoreNames.contains(STORE_BLOCK_DRAFTS)) {
        db.createObjectStore(STORE_BLOCK_DRAFTS, { keyPath: 'id' }).createIndex('blockId', 'blockId');
      }
      if (event.oldVersion === 1 && req.transaction) dropPreUuidV7Templates(req.transaction);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb open failed'));
  });
}

/**
 * Beta clean-up on the way to v2: saved templates whose id is not a UUIDv7 are deleted. The working
 * draft stays, but no longer points to a deleted template, so it shows as unsaved work.
 */
function dropPreUuidV7Templates(tx: IDBTransaction): void {
  const library = tx.objectStore(STORE_LIBRARY);
  const keys = library.getAllKeys();
  keys.onsuccess = () => {
    (keys.result as string[]).filter((id) => !isUuidV7(id)).forEach((id) => library.delete(id));
  };
  const recovery = tx.objectStore(STORE_RECOVERY);
  const draft = recovery.get(RECOVERY_KEY);
  draft.onsuccess = () => {
    const doc = draft.result as RecoveryDoc | undefined;
    if (doc?.libraryId && !isUuidV7(doc.libraryId)) recovery.put({ ...doc, libraryId: null, dirty: true });
  };
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb tx failed'));
    tx.onabort = () => reject(tx.error ?? new Error('idb tx aborted'));
  });
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readonly');
    const req = tx.objectStore(STORE_LIBRARY).getAll();
    req.onsuccess = () => {
      const rows = (req.result as LibraryEntry[]) ?? [];
      rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLibraryEntry(id: string): Promise<LibraryEntry | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readonly');
    const req = tx.objectStore(STORE_LIBRARY).get(id);
    req.onsuccess = () => resolve((req.result as LibraryEntry) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putLibraryEntry(entry: LibraryEntry): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIBRARY, 'readwrite');
  tx.objectStore(STORE_LIBRARY).put(entry);
  await txDone(tx);
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIBRARY, 'readwrite');
  tx.objectStore(STORE_LIBRARY).delete(id);
  await txDone(tx);
}

export async function saveRecovery(doc: Omit<RecoveryDoc, 'key' | 'schemaVersion' | 'savedAt'>): Promise<void> {
  const row: RecoveryDoc = {
    key: RECOVERY_KEY,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    ...doc,
  };
  const db = await openDb();
  const tx = db.transaction(STORE_RECOVERY, 'readwrite');
  tx.objectStore(STORE_RECOVERY).put(row);
  await txDone(tx);
}

export async function loadRecovery(): Promise<RecoveryDoc | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECOVERY, 'readonly');
    const req = tx.objectStore(STORE_RECOVERY).get(RECOVERY_KEY);
    req.onsuccess = () => resolve((req.result as RecoveryDoc) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecovery(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_RECOVERY, 'readwrite');
  tx.objectStore(STORE_RECOVERY).delete(RECOVERY_KEY);
  await txDone(tx);
}

/** Row next to the draft that lists the demos removed from the start page (no schema change). */
export const HIDDEN_DEMOS_KEY = 'hiddenDemos';

export async function loadHiddenDemos(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECOVERY, 'readonly');
    const req = tx.objectStore(STORE_RECOVERY).get(HIDDEN_DEMOS_KEY);
    req.onsuccess = () => {
      const langs = (req.result as { langs?: unknown } | undefined)?.langs;
      resolve(Array.isArray(langs) ? langs.filter((l): l is string => typeof l === 'string') : []);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveHiddenDemos(langs: string[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_RECOVERY, 'readwrite');
  tx.objectStore(STORE_RECOVERY).put({ key: HIDDEN_DEMOS_KEY, langs });
  await txDone(tx);
}

/** Migrate legacy localStorage draft into IDB recovery once. */
export async function migrateLegacyLocalStorageIfNeeded(): Promise<RecoveryDoc | null> {
  const existing = await loadRecovery();
  if (existing) return existing;
  const legacy = loadNewsletter();
  if (!legacy) return null;
  const doc: Omit<RecoveryDoc, 'key' | 'schemaVersion' | 'savedAt'> = {
    displayName: '',
    libraryId: null,
    dirty: true,
    newsletter: legacy,
  };
  await saveRecovery(doc);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return loadRecovery();
}

export function buildProjectEnvelope(
  newsletter: Newsletter,
  displayName: string,
  libraryId: string | null,
): ProjectFileEnvelope {
  return {
    kind: 'nte-project',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    displayName,
    libraryId,
    newsletter,
    exportedAt: new Date().toISOString(),
  };
}

export function parseProjectFile(raw: string): {
  newsletter: Newsletter;
  displayName: string;
  libraryId: string | null;
} | null {
  try {
    const parsed = JSON.parse(raw) as ProjectFileEnvelope | StoredEnvelope | Newsletter;
    if (parsed && typeof parsed === 'object' && 'kind' in parsed && (parsed as ProjectFileEnvelope).kind === 'nte-project') {
      const p = parsed as ProjectFileEnvelope;
      if (!p.newsletter?.globals || !Array.isArray(p.newsletter.blocks)) return null;
      return {
        newsletter: normalizeNewsletter(p.newsletter),
        displayName: p.displayName || '',
        libraryId: p.libraryId ?? null,
      };
    }
    if (parsed && typeof parsed === 'object' && 'newsletter' in parsed) {
      const e = parsed as StoredEnvelope;
      if (!e.newsletter?.globals) return null;
      return {
        newsletter: normalizeNewsletter(e.newsletter),
        displayName: '',
        libraryId: null,
      };
    }
    if (parsed && typeof parsed === 'object' && 'globals' in parsed && 'blocks' in parsed) {
      return {
        newsletter: normalizeNewsletter(parsed as Newsletter),
        displayName: '',
        libraryId: null,
      };
    }
  } catch {
    return null;
  }
  return null;
}
