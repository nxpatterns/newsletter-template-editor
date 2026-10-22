import type { BlockDraft, OwnBlock, OwnBlockVersion } from '../own-blocks/model';
import type { LibraryEntry, RecoveryDoc } from '../persist/idb-docs';
import { normalizeNewsletter } from '../persist/normalize-newsletter';
import { CURRENT_SCHEMA_VERSION, type Newsletter } from '../types';
import { RESET_KINDS, type ResetKind } from './reset-kinds';

/** The stored data of the kinds a backup holds; a missing field means that kind is not in it. */
export interface BackupData {
  templates?: LibraryEntry[];
  ownBlocks?: OwnBlock[];
  /** Saved with the own blocks; versions belong to their block. */
  blockVersions?: OwnBlockVersion[];
  blockDrafts?: BlockDraft[];
  workingDraft?: RecoveryDoc | null;
  viewSettings?: Record<string, string>;
}

/**
 * "Save selected as a file" in the reset dialog (decision 67): same envelope as the project file,
 * with its own `kind` (decision 23). Holds only the checked kinds, listed in `contains`.
 */
export interface BackupFileEnvelope extends BackupData {
  kind: 'nte-backup';
  schemaVersion: number;
  exportedAt: string;
  contains: ResetKind[];
}

export function buildBackup(data: BackupData, kinds: readonly ResetKind[], exportedAt: string): BackupFileEnvelope {
  const contains = RESET_KINDS.filter((k) => kinds.includes(k));
  const file: BackupFileEnvelope = { kind: 'nte-backup', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt, contains };
  if (contains.includes('templates')) file.templates = data.templates ?? [];
  if (contains.includes('ownBlocks')) {
    file.ownBlocks = data.ownBlocks ?? [];
    file.blockVersions = data.blockVersions ?? [];
  }
  if (contains.includes('blockDrafts')) file.blockDrafts = data.blockDrafts ?? [];
  if (contains.includes('workingDraft')) file.workingDraft = data.workingDraft ?? null;
  if (contains.includes('viewSettings')) file.viewSettings = data.viewSettings ?? {};
  return file;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const hasId = (v: unknown): v is Record<string, unknown> & { id: string } => isObject(v) && typeof v['id'] === 'string' && v['id'] !== '';
const isNewsletter = (v: unknown): v is Newsletter => isObject(v) && isObject(v['globals']) && Array.isArray(v['blocks']);

function rows<T>(value: unknown, valid: (row: unknown) => row is T): T[] {
  return Array.isArray(value) ? value.filter(valid) : [];
}

/** Cheap check before parsing, e.g. to tell a backup from a project file. */
export function isBackupFile(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isObject(parsed) && parsed['kind'] === 'nte-backup';
  } catch {
    return false;
  }
}

/** Reads a backup file; rows that are not plain records with an id are dropped. Null when it is no backup. */
export function parseBackupFile(raw: string): BackupFileEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed['kind'] !== 'nte-backup') return null;
  const listed = Array.isArray(parsed['contains']) ? parsed['contains'] : [];
  const contains = RESET_KINDS.filter((k) => listed.includes(k));
  const file: BackupFileEnvelope = {
    kind: 'nte-backup',
    schemaVersion: typeof parsed['schemaVersion'] === 'number' ? parsed['schemaVersion'] : CURRENT_SCHEMA_VERSION,
    exportedAt: typeof parsed['exportedAt'] === 'string' ? parsed['exportedAt'] : '',
    contains,
  };
  if (contains.includes('templates')) {
    file.templates = rows(parsed['templates'], (r): r is LibraryEntry => hasId(r) && isNewsletter(r['newsletter'])).map(
      (e) => ({ ...e, newsletter: normalizeNewsletter(e.newsletter) }),
    );
  }
  if (contains.includes('ownBlocks')) {
    file.ownBlocks = rows(parsed['ownBlocks'], (r): r is OwnBlock => hasId(r));
    file.blockVersions = rows(
      parsed['blockVersions'],
      (r): r is OwnBlockVersion => hasId(r) && typeof r['blockId'] === 'string' && isObject(r['content']),
    );
  }
  if (contains.includes('blockDrafts')) {
    file.blockDrafts = rows(parsed['blockDrafts'], (r): r is BlockDraft => hasId(r) && isObject(r['content']));
  }
  if (contains.includes('workingDraft')) {
    const doc = parsed['workingDraft'];
    file.workingDraft =
      isObject(doc) && isNewsletter(doc['newsletter'])
        ? ({ ...doc, newsletter: normalizeNewsletter(doc['newsletter']) } as RecoveryDoc)
        : null;
  }
  if (contains.includes('viewSettings')) {
    const settings = isObject(parsed['viewSettings']) ? parsed['viewSettings'] : {};
    file.viewSettings = Object.fromEntries(Object.entries(settings).filter(([, v]) => typeof v === 'string')) as Record<
      string,
      string
    >;
  }
  return file;
}
