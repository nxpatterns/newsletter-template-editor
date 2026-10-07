import { CURRENT_SCHEMA_VERSION, type Newsletter } from '../types';
import { DEFAULT_DISPLAY_NAME } from '../file/sanitize-stem';
import { STORAGE_KEY, type StoredEnvelope, loadNewsletter } from './storage';

const DB_NAME = 'nte-docs';
const DB_VERSION = 1;
const STORE_LIBRARY = 'library';
const STORE_RECOVERY = 'recovery';
const RECOVERY_KEY = 'current';

export interface LibraryEntry {
  id: string;
  displayName: string;
  updatedAt: string;
  newsletter: Newsletter;
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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
        db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
        db.createObjectStore(STORE_RECOVERY, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb open failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
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

/** Migrate legacy localStorage draft into IDB recovery once. */
export async function migrateLegacyLocalStorageIfNeeded(): Promise<RecoveryDoc | null> {
  const existing = await loadRecovery();
  if (existing) return existing;
  const legacy = loadNewsletter();
  if (!legacy) return null;
  const doc: Omit<RecoveryDoc, 'key' | 'schemaVersion' | 'savedAt'> = {
    displayName: DEFAULT_DISPLAY_NAME,
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
        newsletter: p.newsletter,
        displayName: p.displayName || DEFAULT_DISPLAY_NAME,
        libraryId: p.libraryId ?? null,
      };
    }
    if (parsed && typeof parsed === 'object' && 'newsletter' in parsed) {
      const e = parsed as StoredEnvelope;
      if (!e.newsletter?.globals) return null;
      return { newsletter: e.newsletter, displayName: DEFAULT_DISPLAY_NAME, libraryId: null };
    }
    if (parsed && typeof parsed === 'object' && 'globals' in parsed && 'blocks' in parsed) {
      return {
        newsletter: parsed as Newsletter,
        displayName: DEFAULT_DISPLAY_NAME,
        libraryId: null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function newLibraryId(): string {
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
