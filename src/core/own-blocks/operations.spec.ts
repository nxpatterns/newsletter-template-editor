import {
  createBlock,
  deleteBlock,
  deleteDraftsOlderThan,
  duplicateBlock,
  publishVersion,
  renameBlock,
  saveDraft,
  type OpContext,
} from './operations';

function ctx(now = '2026-10-22T10:00:00.000Z'): OpContext {
  let n = 0;
  return { now, newId: () => `id-${++n}` };
}

const content = { title: 'Hello' };

describe('own block operations', () => {
  it('creates a block without a version and its first draft, both local', () => {
    const { block, draft, change } = createBlock(ctx(), { name: '  Teaser ', kind: 'free', baseType: 'hero', content });
    expect(block).toMatchObject({ id: 'id-1', name: 'Teaser', kind: 'free', baseType: null, versionCount: 0, latestVersionId: null });
    expect(block).toMatchObject({ tenantId: null, ownerId: null });
    expect(draft).toMatchObject({ id: 'id-2', blockId: 'id-1', name: 'Teaser', content, tenantId: null, ownerId: null });
    expect(change).toEqual({ putBlocks: [block], putDrafts: [draft] });
  });

  it('keeps the base type of a clone', () => {
    const { block } = createBlock(ctx(), { name: '', kind: 'clone', baseType: 'hero', content });
    expect(block.baseType).toBe('hero');
    expect(block.name).toBe('hero');
  });

  it('saves into the existing draft and touches the block', () => {
    const { block, draft } = createBlock(ctx(), { name: 'A', kind: 'free', baseType: null, content });
    const later = ctx('2026-10-22T11:00:00.000Z');
    const saved = saveDraft(later, { block, draft, content: { title: 'Changed' } });
    expect(saved.draft).toMatchObject({ id: draft.id, content: { title: 'Changed' }, updatedAt: later.now, createdAt: draft.createdAt });
    expect(saved.change.putBlocks?.[0].updatedAt).toBe(later.now);
  });

  it('creates a draft when the block has none', () => {
    const { block } = createBlock(ctx(), { name: 'A', kind: 'free', baseType: null, content });
    const { draft } = saveDraft(ctx(), { block, draft: null, content });
    expect(draft.blockId).toBe(block.id);
  });

  it('publishes the draft as the next version and uses the draft up', () => {
    const c = ctx();
    const { block, draft } = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    const first = publishVersion(c, { block, draft });
    expect(first.version).toMatchObject({ blockId: block.id, number: 1, content });
    expect(first.change.deleteDraftIds).toEqual([draft.id]);
    const published = first.change.putBlocks![0];
    expect(published).toMatchObject({ latestVersionId: first.version.id, versionCount: 1 });

    const second = publishVersion(c, { block: published, draft: saveDraft(c, { block: published, draft: null, content }).draft });
    expect(second.version.number).toBe(2);
  });

  it('renames block and draft, and ignores an empty name', () => {
    const { block, draft } = createBlock(ctx(), { name: 'A', kind: 'free', baseType: null, content });
    const change = renameBlock(ctx(), { block, draft, name: ' B ' });
    expect(change.putBlocks?.[0].name).toBe('B');
    expect(change.putDrafts?.[0].name).toBe('B');
    expect(renameBlock(ctx(), { block, draft, name: '   ' })).toEqual({});
  });

  it('duplicates with the newest version as version 1 and a copy of the draft', () => {
    const c = ctx();
    const { block, draft } = createBlock(c, { name: 'A', kind: 'clone', baseType: 'hero', content });
    const { version, change } = publishVersion(c, { block, draft });
    const original = change.putBlocks![0];
    const openDraft = saveDraft(c, { block: original, draft: null, content: { title: 'Next' } }).draft;

    const copy = duplicateBlock(c, { block: original, latestVersion: version, draft: openDraft, name: 'A (copy)' });
    expect(copy.block).toMatchObject({ name: 'A (copy)', kind: 'clone', baseType: 'hero', versionCount: 1 });
    expect(copy.block.id).not.toBe(original.id);
    expect(copy.change.putVersions?.[0]).toMatchObject({ blockId: copy.block.id, number: 1, content });
    expect(copy.change.putDrafts?.[0]).toMatchObject({ blockId: copy.block.id, content: { title: 'Next' } });
  });

  it('duplicates a block without a version', () => {
    const c = ctx();
    const { block } = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    const copy = duplicateBlock(c, { block, latestVersion: null, draft: null, name: '' });
    expect(copy.block).toMatchObject({ name: 'A', versionCount: 0, latestVersionId: null });
    expect(copy.change.putVersions).toBeUndefined();
  });

  it('deletes a block with its versions and draft', () => {
    const c = ctx();
    const { block, draft } = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    const { version } = publishVersion(c, { block, draft });
    expect(deleteBlock({ block, versions: [version], draft })).toEqual({
      deleteBlockIds: [block.id],
      deleteVersionIds: [version.id],
      deleteDraftIds: [draft.id],
    });
  });

  it('deletes only drafts changed before the cutoff', () => {
    const old = createBlock(ctx('2026-01-01T00:00:00.000Z'), { name: 'Old', kind: 'free', baseType: null, content }).draft;
    const fresh = createBlock(ctx('2026-10-01T00:00:00.000Z'), { name: 'New', kind: 'free', baseType: null, content }).draft;
    expect(deleteDraftsOlderThan([old, fresh], '2026-07-24T00:00:00.000Z')).toEqual({ deleteDraftIds: [old.id] });
    expect(deleteDraftsOlderThan([fresh], '2026-07-24T00:00:00.000Z')).toEqual({});
  });
});
