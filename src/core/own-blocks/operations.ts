import type { IdSource } from '../id/uuid-v7';
import type {
  BlockDraft,
  BlockLibraryChange,
  OwnBlock,
  OwnBlockContent,
  OwnBlockKind,
  OwnBlockVersion,
} from './model';

/**
 * Pure library operations for own blocks: records in, records out, nothing stored. The caller
 * passes the time and the id source and hands the returned change to the block repository.
 */
export interface OpContext {
  /** ISO timestamp of this action. */
  now: string;
  newId: IdSource;
}

const LOCAL = { tenantId: null, ownerId: null } as const;

function cleanName(name: string, fallback: string): string {
  return name.trim() || fallback;
}

/** New own block without a version yet, plus its first draft. */
export function createBlock(
  ctx: OpContext,
  input: { name: string; kind: OwnBlockKind; baseType: OwnBlock['baseType']; content: OwnBlockContent },
): { block: OwnBlock; draft: BlockDraft; change: BlockLibraryChange } {
  const block: OwnBlock = {
    ...LOCAL,
    id: ctx.newId(),
    name: cleanName(input.name, input.kind === 'free' ? 'Block' : (input.baseType ?? 'Block')),
    kind: input.kind,
    baseType: input.kind === 'free' ? null : input.baseType,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    latestVersionId: null,
    versionCount: 0,
  };
  const draft = newDraft(ctx, block, input.content);
  return { block, draft, change: { putBlocks: [block], putDrafts: [draft] } };
}

/** Store the editor content as the block's draft, creating the draft when there is none. */
export function saveDraft(
  ctx: OpContext,
  input: { block: OwnBlock | null; draft: BlockDraft | null; content: OwnBlockContent },
): { draft: BlockDraft; change: BlockLibraryChange } {
  const { block } = input;
  const draft: BlockDraft = input.draft
    ? { ...input.draft, content: input.content, updatedAt: ctx.now }
    : newDraft(ctx, block, input.content);
  const change: BlockLibraryChange = { putDrafts: [draft] };
  if (block) change.putBlocks = [{ ...block, updatedAt: ctx.now }];
  return { draft, change };
}

/** Turn the draft into the block's next version; the draft is used up. */
export function publishVersion(
  ctx: OpContext,
  input: { block: OwnBlock; draft: BlockDraft },
): { version: OwnBlockVersion; change: BlockLibraryChange } {
  const { block, draft } = input;
  const version: OwnBlockVersion = {
    tenantId: block.tenantId,
    ownerId: block.ownerId,
    id: ctx.newId(),
    blockId: block.id,
    number: block.versionCount + 1,
    createdAt: ctx.now,
    content: draft.content,
  };
  const updated: OwnBlock = {
    ...block,
    latestVersionId: version.id,
    versionCount: version.number,
    updatedAt: ctx.now,
  };
  return {
    version,
    change: { putBlocks: [updated], putVersions: [version], deleteDraftIds: [draft.id] },
  };
}

/** New name for the block and its draft; an empty name changes nothing. */
export function renameBlock(
  ctx: OpContext,
  input: { block: OwnBlock; draft: BlockDraft | null; name: string },
): BlockLibraryChange {
  const name = input.name.trim();
  if (!name || name === input.block.name) return {};
  const change: BlockLibraryChange = { putBlocks: [{ ...input.block, name, updatedAt: ctx.now }] };
  if (input.draft) change.putDrafts = [{ ...input.draft, name, updatedAt: ctx.now }];
  return change;
}

/**
 * Independent copy under a new name: the newest version becomes version 1 of the copy, and an
 * open draft is copied too.
 */
export function duplicateBlock(
  ctx: OpContext,
  input: { block: OwnBlock; latestVersion: OwnBlockVersion | null; draft: BlockDraft | null; name: string },
): { block: OwnBlock; change: BlockLibraryChange } {
  const { latestVersion, draft } = input;
  const block: OwnBlock = {
    ...input.block,
    id: ctx.newId(),
    name: cleanName(input.name, input.block.name),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    latestVersionId: null,
    versionCount: 0,
  };
  const change: BlockLibraryChange = {};
  if (latestVersion) {
    const version: OwnBlockVersion = {
      ...latestVersion,
      id: ctx.newId(),
      blockId: block.id,
      number: 1,
      createdAt: ctx.now,
    };
    block.latestVersionId = version.id;
    block.versionCount = 1;
    change.putVersions = [version];
  }
  change.putBlocks = [block];
  if (draft) change.putDrafts = [newDraft(ctx, block, draft.content)];
  return { block, change };
}

/**
 * Remove a block with its versions and its draft. Templates keep their inserted copy
 * (decision 58); undo puts the same records back.
 */
export function deleteBlock(input: {
  block: OwnBlock;
  versions: OwnBlockVersion[];
  draft: BlockDraft | null;
}): BlockLibraryChange {
  const change: BlockLibraryChange = {
    deleteBlockIds: [input.block.id],
    deleteVersionIds: input.versions.map((v) => v.id),
  };
  if (input.draft) change.deleteDraftIds = [input.draft.id];
  return change;
}

/** "Delete drafts older than …" (decision 60): drafts last changed before the cutoff; versions stay. */
export function deleteDraftsOlderThan(drafts: BlockDraft[], cutoff: string): BlockLibraryChange {
  const ids = drafts.filter((d) => d.updatedAt < cutoff).map((d) => d.id);
  return ids.length ? { deleteDraftIds: ids } : {};
}

function newDraft(ctx: OpContext, block: OwnBlock | null, content: OwnBlockContent): BlockDraft {
  return {
    tenantId: block?.tenantId ?? null,
    ownerId: block?.ownerId ?? null,
    id: ctx.newId(),
    blockId: block?.id ?? null,
    name: block?.name ?? '',
    createdAt: ctx.now,
    updatedAt: ctx.now,
    content,
  };
}
