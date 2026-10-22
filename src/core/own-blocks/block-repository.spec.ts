import { IDBFactory } from 'fake-indexeddb';
import { seedNewsletter } from '../seed';
import { clearAllDocs, getLibraryEntry, listLibrary, putLibraryEntry } from '../persist/idb-docs';
import { indexedDbBlockRepository as repo } from './block-repository';
import { createBlock, deleteBlock, publishVersion, saveDraft, type OpContext } from './operations';

function ctx(now: string): OpContext {
  let n = 0;
  return { now, newId: () => `${now}-${++n}` };
}

const content = { title: 'Hello' };

describe('IndexedDB block repository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('stores a new block with its draft', async () => {
    const { block, draft, change } = createBlock(ctx('2026-10-22T10:00:00.000Z'), {
      name: 'Teaser',
      kind: 'free',
      baseType: null,
      content,
    });
    await repo.apply(change);
    expect(await repo.getBlock(block.id)).toEqual(block);
    expect(await repo.draftForBlock(block.id)).toEqual(draft);
    expect(await repo.getDraft(draft.id)).toEqual(draft);
  });

  it('publishes versions in order and removes the used draft', async () => {
    const c = ctx('2026-10-22T10:00:00.000Z');
    const created = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    await repo.apply(created.change);
    const first = publishVersion(c, created);
    await repo.apply(first.change);
    const block = (await repo.getBlock(created.block.id))!;
    const second = publishVersion(c, { block, draft: saveDraft(c, { block, draft: null, content }).draft });
    await repo.apply(second.change);

    expect((await repo.listVersions(block.id)).map((v) => v.number)).toEqual([1, 2]);
    expect(await repo.getVersion(second.version.id)).toEqual(second.version);
    expect(await repo.draftForBlock(block.id)).toBeNull();
    expect((await repo.getBlock(block.id))?.versionCount).toBe(2);
  });

  it('lists blocks and drafts last changed first, standalone drafts included', async () => {
    const older = createBlock(ctx('2026-10-01T00:00:00.000Z'), { name: 'Older', kind: 'free', baseType: null, content });
    const newer = createBlock(ctx('2026-10-20T00:00:00.000Z'), { name: 'Newer', kind: 'free', baseType: null, content });
    const standalone = saveDraft(ctx('2026-10-10T00:00:00.000Z'), { block: null, draft: null, content }).draft;
    await repo.apply(older.change);
    await repo.apply(newer.change);
    await repo.apply({ putDrafts: [standalone] });

    expect((await repo.listBlocks()).map((b) => b.name)).toEqual(['Newer', 'Older']);
    expect((await repo.listDrafts()).map((d) => d.id)).toEqual([newer.draft.id, standalone.id, older.draft.id]);
  });

  it('deletes a block with its versions and draft', async () => {
    const c = ctx('2026-10-22T10:00:00.000Z');
    const created = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    const { version, change } = publishVersion(c, created);
    const draft = saveDraft(c, { block: change.putBlocks![0], draft: null, content }).draft;
    await repo.apply(created.change);
    await repo.apply(change);
    await repo.apply({ putDrafts: [draft] });

    await repo.apply(deleteBlock({ block: created.block, versions: [version], draft }));
    expect(await repo.listBlocks()).toEqual([]);
    expect(await repo.listVersions(created.block.id)).toEqual([]);
    expect(await repo.listDrafts()).toEqual([]);
  });

  it('writes nothing when one part of a change fails', async () => {
    const { block, change } = createBlock(ctx('2026-10-22T10:00:00.000Z'), { name: 'A', kind: 'free', baseType: null, content });
    const broken = { ...change, putVersions: [{ notAnId: true } as never] };
    await expect(repo.apply(broken)).rejects.toBeTruthy();
    expect(await repo.getBlock(block.id)).toBeNull();
  });

  it('factory reset clears own blocks, versions and drafts too', async () => {
    const c = ctx('2026-10-22T10:00:00.000Z');
    const created = createBlock(c, { name: 'A', kind: 'free', baseType: null, content });
    await repo.apply(created.change);
    await repo.apply(publishVersion(c, created).change);
    await clearAllDocs();
    expect(await repo.listBlocks()).toEqual([]);
    expect(await repo.listDrafts()).toEqual([]);
    expect(await repo.listVersions(created.block.id)).toEqual([]);
  });

  it('upgrading a version 1 database keeps the saved templates', async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('nte-docs', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('library', { keyPath: 'id' }).put({
          id: 'lib-old',
          displayName: 'Old template',
          updatedAt: '2026-01-01T00:00:00.000Z',
          newsletter: seedNewsletter('de'),
        });
        db.createObjectStore('recovery', { keyPath: 'key' });
      };
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    expect((await listLibrary()).map((e) => e.id)).toEqual(['lib-old']);
    expect(await repo.listBlocks()).toEqual([]);
    await putLibraryEntry({ id: 'new', displayName: 'New', updatedAt: '2026-10-22T00:00:00.000Z', newsletter: seedNewsletter('en') });
    expect((await getLibraryEntry('lib-old'))?.displayName).toBe('Old template');
  });
});
