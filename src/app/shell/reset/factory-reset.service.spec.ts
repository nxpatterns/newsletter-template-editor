import { TestBed } from '@angular/core/testing';
import type { LibraryEntry, RecoveryDoc } from '../../../core/persist/idb-docs';
import type { TemplateRepository } from '../../../core/persist/template-repository';
import type { AppDataStore, StoredInventory } from '../../../core/reset/app-data-store';
import { parseBackupFile } from '../../../core/reset/backup-file';
import type { ResetKind } from '../../../core/reset/reset-kinds';
import { seedNewsletter, type SeedLanguage } from '../../../core';
import { APP_DATA_STORE } from '../../editor/app-data-store.token';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { TEMPLATE_REPOSITORY } from '../../editor/template-repository.token';
import { LOCALE_STORAGE_KEY } from '../../i18n/types';
import { takeAppNotice } from './app-notice';
import {
  APP_RELOAD,
  APP_STORAGE_PREFIX,
  clearAppStorage,
  FactoryResetService,
  readAppStorage,
  SAVE_FILE,
  writeAppStorage,
} from './factory-reset.service';
import { ResetDialogService, type ResetDialogResult } from './reset-dialog.service';

/** In-memory repository: two saved templates and a draft. */
function memoryRepo(): TemplateRepository & {
  entries: Map<string, LibraryEntry>;
  draft: RecoveryDoc | null;
  hidden: SeedLanguage[];
} {
  const newsletter = seedNewsletter('en');
  const entries = new Map<string, LibraryEntry>(
    ['a', 'b'].map((id) => [id, { id, displayName: id, updatedAt: '2026-10-20T10:00:00Z', newsletter }]),
  );
  const repo = {
    entries,
    draft: {
      key: 'current',
      displayName: 'draft',
      libraryId: null,
      dirty: true,
      newsletter,
      savedAt: '2026-10-20T10:00:00Z',
      schemaVersion: 1,
    } as RecoveryDoc | null,
    hidden: [] as SeedLanguage[],
    list: async () =>
      [...entries.values()].map((e) => ({ id: e.id, displayName: e.displayName, updatedAt: e.updatedAt, blockCount: 0, subject: '', pinnedAt: e.pinnedAt ?? null })),
    get: async (id: string) => entries.get(id) ?? null,
    put: async (e: LibraryEntry) => void entries.set(e.id, e),
    remove: async (id: string) => void entries.delete(id),
    loadDraft: async () => repo.draft,
    saveDraft: async () => undefined,
    clearDraft: async () => void (repo.draft = null),
    hiddenDemos: async () => [...repo.hidden],
    setHiddenDemos: async (langs: SeedLanguage[]) => void (repo.hidden = [...langs]),
  };
  return repo;
}

/** Stored data as the reset dialog sees it; records what was read and cleared. */
function fakeStore(inventory: Partial<StoredInventory> = {}) {
  const store = {
    cleared: [] as ResetKind[][],
    read: [] as ResetKind[][],
    failClear: false,
    inventory: async (): Promise<StoredInventory> => ({
      templates: 2,
      hiddenDemos: 0,
      ownBlocks: 3,
      blockDrafts: 0,
      oldestDraftAt: null,
      workingDraft: { displayName: 'draft', dirty: true, savedAt: '2026-10-20T10:00:00Z', libraryId: null },
      ...inventory,
    }),
    readKinds: async (kinds: readonly ResetKind[]) => {
      store.read.push([...kinds]);
      return kinds.includes('templates') ? { templates: [] } : {};
    },
  };
  const api: AppDataStore = {
    inventory: store.inventory,
    read: store.readKinds,
    clear: async (kinds) => {
      if (store.failClear) throw new Error('blocked');
      store.cleared.push([...kinds]);
    },
    restore: async () => ({ templates: 0, ownBlocks: 0, blockDrafts: 0, workingDraft: false }),
  };
  return { store, api };
}

describe('FactoryResetService', () => {
  let repo: ReturnType<typeof memoryRepo>;
  let data: ReturnType<typeof fakeStore>;
  let reload: ReturnType<typeof vi.fn>;
  let saved: { blob: Blob; name: string }[];
  let reset: FactoryResetService;
  let dialog: ResetDialogService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(LOCALE_STORAGE_KEY, 'de');
    localStorage.setItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`, '420');
    localStorage.setItem(`${APP_STORAGE_PREFIX}group-open.v1`, '{}');
    localStorage.setItem('other-app', 'x');
    repo = memoryRepo();
    data = fakeStore();
    reload = vi.fn();
    saved = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: TEMPLATE_REPOSITORY, useValue: repo },
        { provide: APP_DATA_STORE, useValue: data.api },
        { provide: APP_RELOAD, useValue: reload },
        { provide: SAVE_FILE, useValue: (blob: Blob, name: string) => saved.push({ blob, name }) },
      ],
    });
    reset = TestBed.inject(FactoryResetService);
    dialog = TestBed.inject(ResetDialogService);
  });

  /** Wait for the dialog, then answer it. */
  async function answer(result: ResetDialogResult | null): Promise<void> {
    await vi.waitFor(() => expect(dialog.pending()).not.toBeNull());
    dialog.complete(result);
  }

  const everything: ResetDialogResult = {
    kinds: ['templates', 'ownBlocks', 'workingDraft', 'viewSettings'],
    everything: true,
    backupFile: null,
  };

  it('shows what is stored, the remembered views counted, without the language', async () => {
    const done = reset.run();
    await vi.waitFor(() => expect(dialog.pending()).not.toBeNull());
    expect(dialog.pending()?.inventory).toMatchObject({ templates: 2, ownBlocks: 3, blockDrafts: 0, viewSettings: 2 });
    dialog.complete(null);
    expect(await done).toBe(false);
  });

  it('cancel deletes nothing and does not reload', async () => {
    const done = reset.run();
    await answer(null);
    expect(await done).toBe(false);
    expect(data.store.cleared).toEqual([]);
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBe('420');
    expect(reload).not.toHaveBeenCalled();
  });

  it('deleting everything clears the stores and the views, keeps the language, then reloads with a message', async () => {
    const done = reset.run();
    await answer(everything);
    expect(await done).toBe(true);
    expect(data.store.cleared).toEqual([everything.kinds]);
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBeNull();
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
    expect(localStorage.getItem('other-app')).toBe('x');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(takeAppNotice()).toEqual({
      kind: 'reset',
      everything: true,
      deleted: { templates: 2, ownBlocks: 3, workingDraft: 1, viewSettings: 2 },
      backupFile: null,
    });
  });

  it('unchecked kinds stay: view settings are kept when not checked', async () => {
    const done = reset.run();
    await answer({ kinds: ['ownBlocks'], everything: false, backupFile: 'b.json' });
    expect(await done).toBe(true);
    expect(data.store.cleared).toEqual([['ownBlocks']]);
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBe('420');
    expect(takeAppNotice()).toMatchObject({ kind: 'reset', everything: false, deleted: { ownBlocks: 3 }, backupFile: 'b.json' });
  });

  it('the save button writes a file with only the checked kinds', async () => {
    const done = reset.run();
    await vi.waitFor(() => expect(dialog.pending()).not.toBeNull());
    const name = await dialog.pending()!.save(['templates', 'viewSettings']);
    expect(name).toMatch(/^newsletter-sicherung-\d{4}-\d{2}-\d{2}\.json$/);
    expect(data.store.read).toEqual([['templates', 'viewSettings']]);
    const file = parseBackupFile(await saved[0].blob.text());
    expect(file?.contains).toEqual(['templates', 'viewSettings']);
    expect(Object.keys(file?.viewSettings ?? {}).sort()).toEqual([
      `${APP_STORAGE_PREFIX}group-open.v1`,
      `${APP_STORAGE_PREFIX}side-panel-width.v1`,
    ]);
    dialog.complete(null);
    await done;
  });

  it('a failed save reports no file', async () => {
    data.api.read = async () => {
      throw new Error('blocked');
    };
    const done = reset.run();
    await vi.waitFor(() => expect(dialog.pending()).not.toBeNull());
    expect(await dialog.pending()!.save(['templates'])).toBeNull();
    expect(saved).toEqual([]);
    dialog.complete(null);
    await done;
  });

  it('a failed delete keeps the views and reloads with an error message', async () => {
    data.store.failClear = true;
    const done = reset.run();
    await answer(everything);
    expect(await done).toBe(false);
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBe('420');
    expect(takeAppNotice()).toEqual({ kind: 'resetFailed' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a deleted demo leaves the start page, undo brings it back', async () => {
    const session = TestBed.inject(NewsletterSession);
    const undo = await session.hideDemoWithUndo('de');
    expect((await session.recentOverview()).hiddenDemos).toEqual(['de']);
    await undo();
    expect((await session.recentOverview()).hiddenDemos).toEqual([]);
  });

  it('pinning keeps "last changed", saving again keeps the pin, unpinning removes it', async () => {
    const session = TestBed.inject(NewsletterSession);
    await session.setPinned('a', true);
    const pinnedAt = repo.entries.get('a')?.pinnedAt;
    expect(pinnedAt).toBeTruthy();
    expect(repo.entries.get('a')?.updatedAt).toBe('2026-10-20T10:00:00Z');
    expect(await session.openLibraryEntry('a')).toBe(true);
    await session.saveToLibrary();
    expect(repo.entries.get('a')?.pinnedAt).toBe(pinnedAt);
    await session.setPinned('a', false);
    expect(repo.entries.get('a')?.pinnedAt).toBeUndefined();
  });

  it('clearAppStorage only touches this app and keeps the language', () => {
    clearAppStorage();
    expect(Object.keys(localStorage).sort()).toEqual([LOCALE_STORAGE_KEY, 'other-app'].sort());
  });

  it('view settings from a backup are written back, other keys and the language are skipped', () => {
    localStorage.clear();
    const written = writeAppStorage({
      [`${APP_STORAGE_PREFIX}group-open.v1`]: '{"a":true}',
      [LOCALE_STORAGE_KEY]: 'en',
      'other-app': 'y',
    });
    expect(written).toBe(1);
    expect(readAppStorage()).toEqual({ [`${APP_STORAGE_PREFIX}group-open.v1`]: '{"a":true}' });
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });
});
