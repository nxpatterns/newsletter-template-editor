import { TestBed } from '@angular/core/testing';
import type { LibraryEntry, RecoveryDoc } from '../../core/persist/idb-docs';
import type { TemplateRepository } from '../../core/persist/template-repository';
import { seedNewsletter, type SeedLanguage } from '../../core';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { TEMPLATE_REPOSITORY } from '../editor/template-repository.token';
import { LOCALE_STORAGE_KEY } from '../i18n/types';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';
import { APP_RELOAD, APP_STORAGE_PREFIX, clearAppStorage, FactoryResetService } from './factory-reset.service';

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
    clearAll: async () => {
      entries.clear();
      repo.draft = null;
      repo.hidden = [];
    },
    newId: () => 'new',
  };
  return repo;
}

describe('FactoryResetService', () => {
  let repo: ReturnType<typeof memoryRepo>;
  let reload: ReturnType<typeof vi.fn>;
  let reset: FactoryResetService;
  let confirm: ConfirmDialogService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LOCALE_STORAGE_KEY, 'de');
    localStorage.setItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`, '420');
    localStorage.setItem(`${APP_STORAGE_PREFIX}group-open.v1`, '{}');
    localStorage.setItem('other-app', 'x');
    repo = memoryRepo();
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: TEMPLATE_REPOSITORY, useValue: repo },
        { provide: APP_RELOAD, useValue: reload },
      ],
    });
    reset = TestBed.inject(FactoryResetService);
    confirm = TestBed.inject(ConfirmDialogService);
  });

  /** Wait for the question, then answer it. */
  async function answer(ok: boolean): Promise<void> {
    await vi.waitFor(() => expect(confirm.pending()).not.toBeNull());
    confirm.completeConfirm(ok);
  }

  it('asks with a required acknowledgement as a danger action', async () => {
    const done = reset.run();
    await vi.waitFor(() => expect(confirm.pending()).not.toBeNull());
    const p = confirm.pending();
    expect(p?.mode).toBe('confirm');
    expect(p?.mode === 'confirm' && p.danger).toBe(true);
    expect(p?.mode === 'confirm' && !!p.acknowledge).toBe(true);
    expect(p?.mode === 'confirm' && p.warning).toBe(true);
    expect(p?.mode === 'confirm' && !!p.note).toBe(true);
    confirm.completeConfirm(false);
    await done;
  });

  it('cancel deletes nothing and does not reload', async () => {
    const done = reset.run();
    await answer(false);
    expect(await done).toBe(false);
    expect(repo.entries.size).toBe(2);
    expect(repo.draft).not.toBeNull();
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBe('420');
    expect(reload).not.toHaveBeenCalled();
  });

  it('confirm deletes templates, draft and UI state, keeps the language, then reloads', async () => {
    const done = reset.run();
    await answer(true);
    expect(await done).toBe(true);
    expect(repo.entries.size).toBe(0);
    expect(repo.draft).toBeNull();
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}side-panel-width.v1`)).toBeNull();
    expect(localStorage.getItem(`${APP_STORAGE_PREFIX}group-open.v1`)).toBeNull();
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
    expect(localStorage.getItem('other-app')).toBe('x');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a deleted demo leaves the start page, undo brings it back', async () => {
    const session = TestBed.inject(NewsletterSession);
    const undo = await session.hideDemoWithUndo('de');
    expect((await session.recentOverview()).hiddenDemos).toEqual(['de']);
    await undo();
    expect((await session.recentOverview()).hiddenDemos).toEqual([]);
  });

  it('confirming the reset brings deleted demos back', async () => {
    const session = TestBed.inject(NewsletterSession);
    await session.hideDemoWithUndo('de');
    await session.hideDemoWithUndo('en');
    expect((await session.recentOverview()).hiddenDemos).toEqual(['de', 'en']);
    const done = reset.run();
    await answer(true);
    expect(await done).toBe(true);
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
});
