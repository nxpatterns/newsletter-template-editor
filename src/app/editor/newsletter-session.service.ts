import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  createBlock,
  loadOrSeed,
  resetToSeed,
  saveNewsletter,
  seedNewsletter,
  type Block,
  type Globals,
  type Newsletter,
} from '../../core';
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

  readonly newsletter = this.newsletterSignal.asReadonly();
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

  hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const loaded = loadOrSeed(seedNewsletter);
    this.newsletterSignal.set(loaded);
    saveNewsletter(loaded);
    this.clearHistory();
    this.ensureSelection(loaded);
  }

  save(): void {
    saveNewsletter(this.newsletterSignal());
    this.snackbar.success(this.i18n.t('snackbar.saved'));
  }

  resetSeed(): void {
    this.endCoalesce();
    this.clearHistory();
    const next = resetToSeed(seedNewsletter);
    this.newsletterSignal.set(next);
    this.editingBlockIdSignal.set(null);
    this.editBaselineBlock = null;
    this.ensureSelection(next);
    this.snackbar.success(this.i18n.t('snackbar.reset'));
  }

  setPanelTab(tab: EditorPanelTab): void {
    this.panelTabSignal.set(tab);
  }

  selectBlock(id: string | null): void {
    this.selectedBlockIdSignal.set(id);
    if (id) this.panelTabSignal.set('placed');
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
      // Restore without pushing history (cancel is not an undo step).
      this.newsletterSignal.update((n) => ({
        ...n,
        blocks: n.blocks.map((b) => (b.id === id ? structuredClone(baseline) : b)),
      }));
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

  addBlock(type: Block['type']): void {
    this.mutateImmediate((n) => {
      const block = createBlock(type);
      this.selectedBlockIdSignal.set(block.id);
      this.panelTabSignal.set('placed');
      return { ...n, blocks: [...n.blocks, block] };
    });
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
    this.syncHistoryFlags();
    this.ensureSelection(prev);
    this.syncEditingBlock(prev);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    this.endCoalesce();
    this.undoStack.push(cloneNewsletter(this.newsletterSignal()));
    const next = this.redoStack.pop()!;
    this.newsletterSignal.set(next);
    this.syncHistoryFlags();
    this.ensureSelection(next);
    this.syncEditingBlock(next);
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
