import { IDBFactory } from 'fake-indexeddb';
import { indexedDbBlockRepository as blocks } from '../own-blocks/block-repository';
import { createBlock, publishVersion, type OpContext } from '../own-blocks/operations';
import {
  getLibraryEntry,
  listLibrary,
  loadHiddenDemos,
  loadRecovery,
  putLibraryEntry,
  saveHiddenDemos,
  saveRecovery,
} from '../persist/idb-docs';
import { seedNewsletter } from '../seed';
import { indexedDbAppDataStore as store } from './app-data-store';
import { buildBackup, parseBackupFile } from './backup-file';
import { RESET_KINDS } from './reset-kinds';

function ctx(now: string): OpContext {
  let n = 0;
  return { now, newId: () => `${now}-${++n}` };
}

const entry = (id: string) => ({ id, displayName: id, updatedAt: '2026-10-20T10:00:00.000Z', newsletter: seedNewsletter('de') });

/** Two templates, the working draft bound to the first, one demo hidden, two blocks: A published (its draft became version 1), B still a draft. */
async function fill() {
  await putLibraryEntry(entry('tpl-a'));
  await putLibraryEntry(entry('tpl-b'));
  await saveRecovery({ displayName: 'tpl-a', libraryId: 'tpl-a', dirty: false, newsletter: seedNewsletter('de') });
  await saveHiddenDemos(['de']);
  const a = createBlock(ctx('2026-10-01T10:00:00.000Z'), { name: 'A', kind: 'free', baseType: null, content: { t: 1 } });
  const b = createBlock(ctx('2026-10-05T10:00:00.000Z'), { name: 'B', kind: 'free', baseType: null, content: { t: 2 } });
  await blocks.apply(a.change);
  await blocks.apply(b.change);
  await blocks.apply(publishVersion(ctx('2026-10-06T10:00:00.000Z'), a).change);
  return { a, b };
}

describe('IndexedDB app data store (reset dialog)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('counts every kind, with the oldest block draft and the working draft', async () => {
    await fill();
    const inv = await store.inventory();
    expect(inv).toMatchObject({ templates: 2, hiddenDemos: 1, ownBlocks: 2, blockDrafts: 1, oldestDraftAt: '2026-10-05T10:00:00.000Z' });
    expect(inv.workingDraft).toMatchObject({ displayName: 'tpl-a', dirty: false, libraryId: 'tpl-a' });
  });

  it('counts nothing in an empty browser', async () => {
    expect(await store.inventory()).toEqual({
      templates: 0,
      hiddenDemos: 0,
      ownBlocks: 0,
      blockDrafts: 0,
      oldestDraftAt: null,
      workingDraft: null,
    });
  });

  it('deleting everything clears all stores and brings the deleted demos back', async () => {
    const { a } = await fill();
    await store.clear(RESET_KINDS);
    expect(await listLibrary()).toEqual([]);
    expect(await loadRecovery()).toBeNull();
    expect(await loadHiddenDemos()).toEqual([]);
    expect(await blocks.listBlocks()).toEqual([]);
    expect(await blocks.listDrafts()).toEqual([]);
    expect(await blocks.listVersions(a.block.id)).toEqual([]);
  });

  it('deleting own blocks without their drafts keeps the drafts as standalone drafts', async () => {
    const { a, b } = await fill();
    await store.clear(['ownBlocks']);
    expect(await blocks.listBlocks()).toEqual([]);
    expect(await blocks.listVersions(a.block.id)).toEqual([]);
    const drafts = await blocks.listDrafts();
    expect(drafts.map((d) => [d.id, d.blockId])).toEqual([[b.draft.id, null]]);
    expect(await listLibrary()).toHaveLength(2);
  });

  it('deleting templates keeps the working draft but unbinds it, and leaves blocks alone', async () => {
    await fill();
    await store.clear(['templates']);
    expect(await listLibrary()).toEqual([]);
    expect(await loadHiddenDemos()).toEqual([]);
    expect(await loadRecovery()).toMatchObject({ libraryId: null, dirty: true, displayName: 'tpl-a' });
    expect(await blocks.listBlocks()).toHaveLength(2);
  });

  it('deleting only the working draft keeps templates and hidden demos', async () => {
    await fill();
    await store.clear(['workingDraft']);
    expect(await loadRecovery()).toBeNull();
    expect(await listLibrary()).toHaveLength(2);
    expect(await loadHiddenDemos()).toEqual(['de']);
  });

  it('reads only the asked kinds; own blocks come with their versions', async () => {
    await fill();
    const data = await store.read(['ownBlocks']);
    expect(Object.keys(data).sort()).toEqual(['blockVersions', 'ownBlocks']);
    expect(data.ownBlocks).toHaveLength(2);
    expect(data.blockVersions).toHaveLength(1);
  });

  it('a backup saved before deleting everything brings everything back', async () => {
    const { a, b } = await fill();
    const before = await store.read(RESET_KINDS);
    const file = parseBackupFile(JSON.stringify(buildBackup(before, RESET_KINDS, '2026-10-22T12:00:00.000Z')));
    await store.clear(RESET_KINDS);
    const added = await store.restore(file!);
    expect(added).toEqual({ templates: 2, ownBlocks: 2, blockDrafts: 1, workingDraft: true });
    expect((await listLibrary()).map((e) => e.id).sort()).toEqual(['tpl-a', 'tpl-b']);
    expect(await loadRecovery()).toMatchObject({ libraryId: 'tpl-a', dirty: false });
    expect(await blocks.listVersions(a.block.id)).toHaveLength(1);
    expect((await blocks.draftForBlock(b.block.id))?.id).toBe(b.draft.id);
  });

  it('restoring keeps rows that exist and never replaces the working draft', async () => {
    await fill();
    const backup = await store.read(RESET_KINDS);
    await putLibraryEntry({ ...entry('tpl-a'), displayName: 'changed later' });
    await saveRecovery({ displayName: 'other work', libraryId: null, dirty: true, newsletter: seedNewsletter('en') });
    const added = await store.restore(backup);
    expect(added).toEqual({ templates: 0, ownBlocks: 0, blockDrafts: 0, workingDraft: false });
    expect((await getLibraryEntry('tpl-a'))?.displayName).toBe('changed later');
    expect((await loadRecovery())?.displayName).toBe('other work');
  });

  it('a restored draft without its block, and work without its template, stand alone', async () => {
    const { b } = await fill();
    const backup = await store.read(['blockDrafts', 'workingDraft']);
    await store.clear(RESET_KINDS);
    await store.restore(backup);
    expect(await blocks.getBlock(b.block.id)).toBeNull();
    expect((await blocks.getDraft(b.draft.id))?.blockId).toBeNull();
    expect(await loadRecovery()).toMatchObject({ libraryId: null, dirty: true });
  });
});
