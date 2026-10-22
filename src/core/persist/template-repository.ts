import type { SeedLanguage } from '../seed';
import {
  clearAllDocs,
  deleteLibraryEntry,
  deleteRecovery,
  getLibraryEntry,
  listLibrary,
  loadHiddenDemos,
  loadRecovery,
  migrateLegacyLocalStorageIfNeeded,
  putLibraryEntry,
  saveHiddenDemos,
  saveRecovery,
  type LibraryEntry,
  type RecoveryDoc,
} from './idb-docs';

/** What lists (start page, Open…) need, without the full newsletter. */
export interface TemplateSummary {
  id: string;
  displayName: string;
  updatedAt: string;
  blockCount: number;
  /** Campaign subject line, so issues with the same header can be told apart. */
  subject: string;
  /** When it was pinned to the start page tiles, else null. */
  pinnedAt: string | null;
}

export type DraftDoc = Omit<RecoveryDoc, 'key' | 'schemaVersion' | 'savedAt'>;

/**
 * Where saved templates and the working draft live. Today: this browser (IndexedDB).
 * Later a cloud implementation for signed-in sellers can replace it without touching components.
 */
export interface TemplateRepository {
  /** Newest first. */
  list(): Promise<TemplateSummary[]>;
  get(id: string): Promise<LibraryEntry | null>;
  put(entry: LibraryEntry): Promise<void>;
  remove(id: string): Promise<void>;
  /** The draft in progress (migrates the legacy localStorage draft once). */
  loadDraft(): Promise<RecoveryDoc | null>;
  saveDraft(doc: DraftDoc): Promise<void>;
  clearDraft(): Promise<void>;
  /** Demos the user removed from the start page. */
  hiddenDemos(): Promise<SeedLanguage[]>;
  setHiddenDemos(langs: SeedLanguage[]): Promise<void>;
  /** Remove every saved template, the draft and all own blocks, and bring the demos back. */
  clearAll(): Promise<void>;
}

export const indexedDbTemplateRepository: TemplateRepository = {
  async list() {
    const rows = await listLibrary();
    return rows.map((e) => ({
      id: e.id,
      displayName: e.displayName,
      updatedAt: e.updatedAt,
      blockCount: e.newsletter?.blocks?.length ?? 0,
      subject: e.newsletter?.globals?.campaignSubject?.trim() ?? '',
      pinnedAt: e.pinnedAt ?? null,
    }));
  },
  get: getLibraryEntry,
  put: putLibraryEntry,
  remove: deleteLibraryEntry,
  loadDraft: migrateLegacyLocalStorageIfNeeded,
  saveDraft: saveRecovery,
  clearDraft: deleteRecovery,
  hiddenDemos: async () => (await loadHiddenDemos()).filter((l): l is SeedLanguage => l === 'de' || l === 'en'),
  setHiddenDemos: saveHiddenDemos,
  clearAll: clearAllDocs,
};

