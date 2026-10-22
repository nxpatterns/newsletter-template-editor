import type { Block } from '../types';

/**
 * Fields for the later cloud sync: empty (null) locally, filled from the account at the first
 * upload after login. Never part of an id.
 */
export interface SyncFields {
  tenantId: string | null;
  ownerId: string | null;
}

/** Adapted copy of a built-in block, or a free block composed from parts. */
export type OwnBlockKind = 'clone' | 'free';

/**
 * What a block holds. Placeholder until clone mode and the parts model (build steps 4 and 5)
 * give it a shape; storage only needs it to be plain JSON.
 */
export type OwnBlockContent = Readonly<Record<string, unknown>>;

/** One own block in the library. Its content lives in versions and in at most one draft. */
export interface OwnBlock extends SyncFields {
  id: string;
  name: string;
  kind: OwnBlockKind;
  /** Built-in type a clone was made from; null for a free block. */
  baseType: Block['type'] | null;
  createdAt: string;
  updatedAt: string;
  /** Newest published version; null while the block has none yet. */
  latestVersionId: string | null;
  /** Number of the newest version, 0 while there is none. */
  versionCount: number;
}

/** A published version; never changed afterwards. Templates record the version they inserted. */
export interface OwnBlockVersion extends SyncFields {
  id: string;
  blockId: string;
  /** 1, 2, 3, … per block. */
  number: number;
  createdAt: string;
  content: OwnBlockContent;
}

/**
 * Work in progress on a block, at most one per block. A draft whose block was deleted keeps its
 * name and stays as a standalone draft (blockId null).
 */
export interface BlockDraft extends SyncFields {
  id: string;
  blockId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  content: OwnBlockContent;
}

/** What an operation writes; a repository applies it as one transaction. */
export interface BlockLibraryChange {
  putBlocks?: OwnBlock[];
  putVersions?: OwnBlockVersion[];
  putDrafts?: BlockDraft[];
  deleteBlockIds?: string[];
  deleteVersionIds?: string[];
  deleteDraftIds?: string[];
}
