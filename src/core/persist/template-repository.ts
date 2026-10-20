import {
  clearAllDocs,
  deleteLibraryEntry,
  deleteRecovery,
  getLibraryEntry,
  listLibrary,
  loadRecovery,
  migrateLegacyLocalStorageIfNeeded,
  newLibraryId,
  putLibraryEntry,
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
  /** Remove every saved template and the draft. */
  clearAll(): Promise<void>;
  newId(): string;
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
    }));
  },
  get: getLibraryEntry,
  put: putLibraryEntry,
  remove: deleteLibraryEntry,
  loadDraft: migrateLegacyLocalStorageIfNeeded,
  saveDraft: saveRecovery,
  clearDraft: deleteRecovery,
  clearAll: clearAllDocs,
  newId: newLibraryId,
};

