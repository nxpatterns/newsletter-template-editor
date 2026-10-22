import {
  createBlock,
  deleteBlock,
  deleteDraftsOlderThan,
  duplicateBlock,
  publishVersion,
  renameBlock,
  saveBlockWork,
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

  describe('saving work from the block editor', () => {
    const base = { kind: 'clone' as const, baseType: 'hero' as const, content };

    it('creates a new block with its draft on the first "save draft"', () => {
      const r = saveBlockWork(ctx(), { ...base, block: null, draft: null, name: 'Hero spring', publish: false });
      expect(r.block).toMatchObject({ name: 'Hero spring', kind: 'clone', baseType: 'hero', versionCount: 0 });
      expect(r.draft).toMatchObject({ blockId: r.block.id, name: 'Hero spring', content });
      expect(r.version).toBeNull();
      expect(r.change).toEqual({ putBlocks: [r.block], putDrafts: [r.draft] });
    });

    it('creates the block under the id its address already has', () => {
      const r = saveBlockWork(ctx(), { ...base, block: null, draft: null, id: 'from-address', name: 'A', publish: false });
      expect(r.block.id).toBe('from-address');
      expect(r.draft?.blockId).toBe('from-address');
    });

    it('publishes a new block straight away without leaving a draft behind', () => {
      const r = saveBlockWork(ctx(), { ...base, block: null, draft: null, name: 'Hero', publish: true });
      expect(r.version).toMatchObject({ blockId: r.block.id, number: 1, content });
      expect(r.block).toMatchObject({ latestVersionId: r.version!.id, versionCount: 1 });
      expect(r.draft).toBeNull();
      expect(r.change.putDrafts).toBeUndefined();
      expect(r.change.deleteDraftIds).toHaveLength(1);
    });

    it('renames and saves into the existing draft, then publishes the next version from it', () => {
      const first = saveBlockWork(ctx(), { ...base, block: null, draft: null, name: 'A', publish: true });
      const later = ctx('2026-10-22T12:00:00.000Z');
      const drafted = saveBlockWork(later, { ...base, block: first.block, draft: null, name: ' B ', publish: false, content: { title: 'v2' } });
      expect(drafted.block).toMatchObject({ name: 'B', updatedAt: later.now, versionCount: 1 });
      expect(drafted.draft).toMatchObject({ name: 'B', content: { title: 'v2' } });
      const published = saveBlockWork(later, { ...base, block: drafted.block, draft: drafted.draft, name: '', publish: true, content: { title: 'v2' } });
      expect(published.block).toMatchObject({ name: 'B', versionCount: 2 });
      expect(published.version).toMatchObject({ number: 2, content: { title: 'v2' } });
      expect(published.change.deleteDraftIds).toEqual([drafted.draft!.id]);
    });
  });
});
