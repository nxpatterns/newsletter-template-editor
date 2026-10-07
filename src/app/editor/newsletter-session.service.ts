import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  createBlock,
  DEFAULT_DISPLAY_NAME,
  seedNewsletter,
  type Block,
  type Globals,
  type Newsletter,
} from '../../core';
import {
  buildProjectEnvelope,
  deleteLibraryEntry,
  getLibraryEntry,
  listLibrary,
  migrateLegacyLocalStorageIfNeeded,
  newLibraryId,
  parseProjectFile,
  putLibraryEntry,
  saveRecovery,
  type LibraryEntry,
} from '../../core/persist/idb-docs';
import { LocaleService } from '../i18n/locale.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

export type EditorPanelTab =
  | 'placed'
  | 'catalog'
  | 'campaign'
  | 'brand'
  | 'colors'
  | 'legal';

/** How a mutation records undo history. */
export type HistoryMode = 'immediate' | 'coalesce';

const HISTORY_CAP = 50;

function cloneNewsletter(n: Newsletter): Newsletter {
  return structuredClone(n);
}

@Injectable({ providedIn: 'root' })
export class NewsletterSession {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly snackbar = inject(SnackbarService);
  private readonly i18n = inject(LocaleService);

  private readonly newsletterSignal = signal<Newsletter>(seedNewsletter());
  private readonly selectedBlockIdSignal = signal<string | null>(null);
  private readonly panelTabSignal = signal<EditorPanelTab>('placed');
  private readonly editingBlockIdSignal = signal<string | null>(null);
  /** Snapshot of the block when the edit modal opened (for Cancel). */
  private editBaselineBlock: Block | null = null;
  /** Undo-stack depth when the modal opened — cancel trims entries pushed during edit. */
  private editUndoDepth = 0;

  private undoStack: Newsletter[] = [];
  private redoStack: Newsletter[] = [];
  private coalesceActive = false;

  private readonly canUndoSignal = signal(false);
  private readonly canRedoSignal = signal(false);

  private readonly displayNameSignal = signal(DEFAULT_DISPLAY_NAME);
  private readonly dirtySignal = signal(false);
  private readonly libraryIdSignal = signal<string | null>(null);
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly recoveryDelayMs = 700;

  readonly newsletter = this.newsletterSignal.asReadonly();
  readonly displayName = this.displayNameSignal.asReadonly();
  readonly dirty = this.dirtySignal.asReadonly();
  readonly libraryId = this.libraryIdSignal.asReadonly();
  readonly selectedBlockId = this.selectedBlockIdSignal.asReadonly();
  readonly panelTab = this.panelTabSignal.asReadonly();
  /** When set, the block edit modal is open for this id. */
  readonly editingBlockId = this.editingBlockIdSignal.asReadonly();
  readonly canUndo = this.canUndoSignal.asReadonly();
  readonly canRedo = this.canRedoSignal.asReadonly();

  readonly selectedBlock = computed((): Block | null => {
    const id = this.selectedBlockIdSignal();
    if (!id) return null;
    return this.newsletterSignal().blocks.find((b) => b.id === id) ?? null;
  });

  readonly editingBlock = computed((): Block | null => {
    const id = this.editingBlockIdSignal();
    if (!id) return null;
    return this.newsletterSignal().blocks.find((b) => b.id === id) ?? null;
  });

  readonly blocks = computed(() => this.newsletterSignal().blocks);
  readonly globals = computed(() => this.newsletterSignal().globals);

  async hydrateFromStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const recovered = await migrateLegacyLocalStorageIfNeeded();
      if (recovered?.newsletter) {
        this.applyDocument(recovered.newsletter, {
          displayName: recovered.displayName || DEFAULT_DISPLAY_NAME,
          libraryId: recovered.libraryId,
          dirty: recovered.dirty,
          clearHistory: true,
        });
      } else {
        const seeded = seedNewsletter();
        this.applyDocument(seeded, {
          displayName: DEFAULT_DISPLAY_NAME,
          libraryId: null,
          dirty: false,
          clearHistory: true,
        });
        await this.persistRecovery();
      }
    } catch {
      const seeded = seedNewsletter();
      this.applyDocument(seeded, {
        displayName: DEFAULT_DISPLAY_NAME,
        libraryId: null,
        dirty: false,
        clearHistory: true,
      });
    }
    this.bindBeforeUnload();
  }

  /** Explicit library save (overwrite bound entry or create). */
  async saveToLibrary(opts?: { asNew?: boolean; name?: string }): Promise<boolean> {
    const name = (opts?.name ?? this.displayNameSignal()).trim() || DEFAULT_DISPLAY_NAME;
    let id = this.libraryIdSignal();
    if (opts?.asNew || !id) {
      id = newLibraryId();
    }
    const entry: LibraryEntry = {
      id,
      displayName: name,
      updatedAt: new Date().toISOString(),
      newsletter: cloneNewsletter(this.newsletterSignal()),
    };
    await putLibraryEntry(entry);
    this.displayNameSignal.set(name);
    this.libraryIdSignal.set(id);
    this.dirtySignal.set(false);
    await this.persistRecovery();
    this.snackbar.success(this.i18n.t('snackbar.savedNamed').replace('{name}', name));
    return true;
  }

  async listLibraryEntries(): Promise<LibraryEntry[]> {
    return listLibrary();
  }

  async openLibraryEntry(id: string): Promise<boolean> {
    const entry = await getLibraryEntry(id);
    if (!entry) return false;
    this.applyDocument(entry.newsletter, {
      displayName: entry.displayName,
      libraryId: entry.id,
      dirty: false,
      clearHistory: true,
    });
    await this.persistRecovery();
    return true;
  }

  async deleteLibrary(id: string): Promise<void> {
    await deleteLibraryEntry(id);
    if (this.libraryIdSignal() === id) {
      this.libraryIdSignal.set(null);
      this.dirtySignal.set(true);
      await this.persistRecovery();
    }
  }

  setDisplayName(name: string): void {
    const next = name.trim() || DEFAULT_DISPLAY_NAME;
    if (next === this.displayNameSignal()) return;
    this.displayNameSignal.set(next);
    this.dirtySignal.set(true);
    this.scheduleRecovery();
  }

  exportProjectJson(): Blob {
    const envelope = buildProjectEnvelope(
      this.newsletterSignal(),
      this.displayNameSignal(),
      this.libraryIdSignal(),
    );
    return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  }

  loadProjectJsonText(raw: string): boolean {
    const parsed = parseProjectFile(raw);
    if (!parsed) return false;
    this.applyDocument(parsed.newsletter, {
      displayName: parsed.displayName,
      libraryId: null,
      dirty: true,
      clearHistory: true,
    });
    this.scheduleRecovery();
    return true;
  }

  async resetSeed(): Promise<void> {
    this.endCoalesce();
    const next = seedNewsletter();
    this.applyDocument(next, {
      displayName: DEFAULT_DISPLAY_NAME,
      libraryId: null,
      dirty: false,
      clearHistory: true,
    });
    await this.persistRecovery();
    this.snackbar.success(this.i18n.t('snackbar.reset'));
  }

  /** @deprecated use saveToLibrary — kept for any leftover callers */
  save(): void {
    void this.saveToLibrary();
  }

  setPanelTab(tab: EditorPanelTab): void {
    this.panelTabSignal.set(tab);
  }

  selectBlock(id: string | null, opts?: { revealInPanel?: boolean }): void {
    this.selectedBlockIdSignal.set(id);
    // Preview / list selection opens Current blocks; catalog DnD must not steal the tab.
    if (id && opts?.revealInPanel !== false) this.panelTabSignal.set('placed');
  }

  /** Select + open the shared block edit modal. */
  openBlockEditor(id: string): void {
    this.selectBlock(id);
    const block = this.newsletterSignal().blocks.find((b) => b.id === id) ?? null;
    this.editBaselineBlock = block ? structuredClone(block) : null;
    this.editUndoDepth = this.undoStack.length;
    this.editingBlockIdSignal.set(id);
  }

  /** Discard in-progress field edits and close the modal. */
  cancelBlockEditor(): void {
    this.endCoalesce();
    const baseline = this.editBaselineBlock;
    const id = this.editingBlockIdSignal();
    if (baseline && id) {
      const current = this.newsletterSignal().blocks.find((b) => b.id === id);
      // Skip no-op restore — avoids preview srcdoc reload / scroll jump when nothing changed.
      const changed =
        !current || JSON.stringify(current) !== JSON.stringify(baseline);
      if (changed) {
        // Restore without pushing history (cancel is not an undo step).
        this.newsletterSignal.update((n) => ({
          ...n,
          blocks: n.blocks.map((b) => (b.id === id ? structuredClone(baseline) : b)),
        }));
      }
    }
    // Drop undo/redo entries created while the modal was open.
    if (this.undoStack.length > this.editUndoDepth) {
      this.undoStack.length = this.editUndoDepth;
    }
    this.redoStack = [];
    this.syncHistoryFlags();
    this.editBaselineBlock = null;
    this.editUndoDepth = 0;
    this.editingBlockIdSignal.set(null);
  }

  /** Keep live edits and close the modal. */
  saveBlockEditor(): void {
    this.endCoalesce();
    this.editBaselineBlock = null;
    this.editUndoDepth = 0;
    this.editingBlockIdSignal.set(null);
  }

  closeBlockEditor(): void {
    this.saveBlockEditor();
  }

  /** Append a block (programmatic / tests). Selects it and reveals Current blocks. */
  addBlock(type: Block['type']): void {
    this.insertBlockAt(type, this.newsletterSignal().blocks.length, { revealInPanel: true });
  }

  /**
   * Insert a catalog block at index (0 = top).
   * Catalog drag-and-drop should pass revealInPanel: false so the All-blocks tab stays put.
   */
  insertBlockAt(
    type: Block['type'],
    index: number,
    opts?: { revealInPanel?: boolean },
  ): string {
    let createdId = '';
    this.mutateImmediate((n) => {
      const block = createBlock(type);
      createdId = block.id;
      const blocks = [...n.blocks];
      const at = Math.max(0, Math.min(index, blocks.length));
      blocks.splice(at, 0, block);
      this.selectedBlockIdSignal.set(block.id);
      if (opts?.revealInPanel !== false) this.panelTabSignal.set('placed');
      return { ...n, blocks };
    });
    return createdId;
  }

  removeBlock(id: string): void {
    this.mutateImmediate((n) => {
      const blocks = n.blocks.filter((b) => b.id !== id);
      if (this.selectedBlockIdSignal() === id) {
        this.selectedBlockIdSignal.set(blocks[0]?.id ?? null);
      }
      if (this.editingBlockIdSignal() === id) {
        this.editingBlockIdSignal.set(null);
        this.editBaselineBlock = null;
      }
      return { ...n, blocks };
    });
  }

  moveBlock(id: string, direction: -1 | 1): void {
    this.mutateImmediate((n) => {
      const index = n.blocks.findIndex((b) => b.id === id);
      if (index < 0) return n;
      const target = index + direction;
      if (target < 0 || target >= n.blocks.length) return n;
      const blocks = [...n.blocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(target, 0, item);
      return { ...n, blocks };
    });
  }

  /** Reorder by full id sequence (drag-and-drop). Unknown ids are dropped. */
  reorderBlocks(orderedIds: readonly string[]): void {
    this.mutateImmediate((n) => {
      const byId = new Map(n.blocks.map((b) => [b.id, b]));
      const blocks: Block[] = [];
      for (const id of orderedIds) {
        const block = byId.get(id);
        if (block) {
          blocks.push(block);
          byId.delete(id);
        }
      }
      for (const leftover of byId.values()) blocks.push(leftover);
      return { ...n, blocks };
    });
  }

  updateBlock(id: string, patch: object, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      blocks: n.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));
  }

  updateGlobals(patch: Partial<Globals>, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: { ...n.globals, ...patch },
    }));
  }

  updateBrand(patch: Partial<Globals['brand']>, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: { ...n.globals, brand: { ...n.globals.brand, ...patch } },
    }));
  }

  updateLogo(patch: Partial<Globals['logo']>, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: { ...n.globals, logo: { ...n.globals.logo, ...patch } },
    }));
  }

  updateLegal(patch: Partial<Globals['legal']>, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: { ...n.globals, legal: { ...n.globals.legal, ...patch } },
    }));
  }

  updateSample(key: string, value: string, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: {
        ...n.globals,
        personalization: {
          ...n.globals.personalization,
          samples: { ...n.globals.personalization.samples, [key]: value },
        },
      },
    }));
  }

  /** End a coalesced text/color edit (field blur, modal close). */
  endCoalesce(): void {
    this.coalesceActive = false;
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    this.endCoalesce();
    this.redoStack.push(cloneNewsletter(this.newsletterSignal()));
    const prev = this.undoStack.pop()!;
    this.newsletterSignal.set(prev);
    this.dirtySignal.set(true);
    this.syncHistoryFlags();
    this.ensureSelection(prev);
    this.syncEditingBlock(prev);
    this.scheduleRecovery();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    this.endCoalesce();
    this.undoStack.push(cloneNewsletter(this.newsletterSignal()));
    const next = this.redoStack.pop()!;
    this.newsletterSignal.set(next);
    this.dirtySignal.set(true);
    this.syncHistoryFlags();
    this.ensureSelection(next);
    this.syncEditingBlock(next);
    this.scheduleRecovery();
  }

  private mutateImmediate(fn: (n: Newsletter) => Newsletter): void {
    this.mutate('immediate', fn);
  }

  private mutate(history: HistoryMode, fn: (n: Newsletter) => Newsletter): void {
    if (history === 'coalesce') {
      if (!this.coalesceActive) {
        this.pushUndoSnapshot();
        this.coalesceActive = true;
      }
    } else {
      this.endCoalesce();
      this.pushUndoSnapshot();
    }
    this.newsletterSignal.update(fn);
    this.dirtySignal.set(true);
    this.scheduleRecovery();
  }

  private applyDocument(
    n: Newsletter,
    meta: { displayName: string; libraryId: string | null; dirty: boolean; clearHistory: boolean },
  ): void {
    this.newsletterSignal.set(n);
    this.displayNameSignal.set(meta.displayName || DEFAULT_DISPLAY_NAME);
    this.libraryIdSignal.set(meta.libraryId);
    this.dirtySignal.set(meta.dirty);
    this.editingBlockIdSignal.set(null);
    this.editBaselineBlock = null;
    if (meta.clearHistory) this.clearHistory();
    this.ensureSelection(n);
  }

  private scheduleRecovery(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      void this.persistRecovery();
    }, this.recoveryDelayMs);
  }

  private async persistRecovery(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await saveRecovery({
        displayName: this.displayNameSignal(),
        libraryId: this.libraryIdSignal(),
        dirty: this.dirtySignal(),
        newsletter: this.newsletterSignal(),
      });
    } catch {
      /* quota / private */
    }
  }

  private bindBeforeUnload(): void {
    window.addEventListener('beforeunload', (event) => {
      if (!this.dirtySignal()) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  private pushUndoSnapshot(): void {
    this.undoStack.push(cloneNewsletter(this.newsletterSignal()));
    if (this.undoStack.length > HISTORY_CAP) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.syncHistoryFlags();
  }

  private clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.coalesceActive = false;
    this.syncHistoryFlags();
  }

  private syncHistoryFlags(): void {
    this.canUndoSignal.set(this.undoStack.length > 0);
    this.canRedoSignal.set(this.redoStack.length > 0);
  }

  private ensureSelection(n: Newsletter): void {
    const current = this.selectedBlockIdSignal();
    if (current && n.blocks.some((b) => b.id === current)) return;
    this.selectedBlockIdSignal.set(n.blocks[0]?.id ?? null);
  }

  private syncEditingBlock(n: Newsletter): void {
    const editing = this.editingBlockIdSignal();
    if (editing && !n.blocks.some((b) => b.id === editing)) {
      this.editingBlockIdSignal.set(null);
      this.editBaselineBlock = null;
    }
  }
}
