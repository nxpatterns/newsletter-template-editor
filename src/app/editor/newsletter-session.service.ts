import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  blankNewsletter,
  createBlock,
  DEMO_DISPLAY_NAMES,
  normalizeNewsletter,
  seedNewsletter,
  type Block,
  type BlockDefaultTexts,
  type FramePart,
  type Globals,
  type Newsletter,
  type RichDoc,
  type SeedLanguage,
} from '../../core';
import { activeColors, effectiveSlotColors, type ColorsConfig } from '../../core/colors';
import { clearParagraphStash } from './paragraph-draft-stash';
import { buildProjectEnvelope, parseProjectFile, type LibraryEntry } from '../../core/persist/idb-docs';
import type { TemplateSummary } from '../../core/persist/template-repository';
import { TEMPLATE_REPOSITORY } from './template-repository.token';
import { ID_SOURCE } from './id-source.token';
import { StoragePersistence } from './storage-persistence.service';
import { editorPanelPath, type EditorPanelTab, type PlacedView } from './panel/panel-routes';
import { LocaleService } from '../i18n/locale.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

export interface RecentOverview {
  draft: { displayName: string; savedAt: string; dirty: boolean; libraryId: string | null } | null;
  saved: TemplateSummary[];
  /** Demos removed from the start page; the factory reset brings them back. */
  hiddenDemos: SeedLanguage[];
}

/** Editor URL segment for a document that is not saved in the library yet. */
export const DRAFT_ROUTE_ID = 'draft';

export type { EditorPanelTab } from './panel/panel-routes';

/** UI-only choice between list and tree for Current blocks (localStorage); the list is the default. */
export const PLACED_VIEW_KEY = 'newsletter-template-editor.placed-view.v1';

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
  private readonly repo = inject(TEMPLATE_REPOSITORY);
  private readonly newId = inject(ID_SOURCE);
  private readonly persistence = inject(StoragePersistence);

  private readonly newsletterSignal = signal<Newsletter>(seedNewsletter());
  private readonly selectedBlockIdSignal = signal<string | null>(null);
  private readonly panelTabSignal = signal<EditorPanelTab>('placed');
  private readonly placedViewSignal = signal<PlacedView>(this.readPlacedView());
  private readonly editingBlockIdSignal = signal<string | null>(null);
  /** Monotonic token so re-selecting the same block still triggers a preview scroll. */
  private readonly previewScrollTokenSignal = signal(0);
  private readonly previewScrollBlockIdSignal = signal<string | null>(null);
  /** Snapshot of the block when the edit modal opened (for Cancel). */
  private editBaselineBlock: Block | null = null;
  /** Undo-stack depth when the modal opened — cancel trims entries pushed during edit. */
  private editUndoDepth = 0;
  /** Dirty flag when the edit modal opened; Cancel restores it. */
  private editBaselineDirty = false;
  private readonly discardedNoticeSignal = signal(false);
  private discardedNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** True for a few seconds after Cancel threw away real edits. */
  readonly discardedNotice = this.discardedNoticeSignal.asReadonly();
  /**
   * Paragraph WYSIWYG draft while the modal is open.
   * Does not mutate the newsletter/preview until Save.
   */
  private paragraphEditDraft: { blockId: string; body: RichDoc } | null = null;
  /** Optional flusher so Save picks up the last debounced keystrokes. */
  private paragraphDraftFlush: (() => void) | null = null;
  /** Paragraph email-width toggle may ask the edit modal to grow. */
  private readonly editModalMinWidthSignal = signal<number | null>(null);
  readonly editModalMinWidth = this.editModalMinWidthSignal.asReadonly();

  private undoStack: Newsletter[] = [];
  private redoStack: Newsletter[] = [];
  private coalesceActive = false;

  private readonly canUndoSignal = signal(false);
  private readonly canRedoSignal = signal(false);

  private readonly displayNameSignal = signal('');
  private readonly dirtySignal = signal(false);
  private readonly libraryIdSignal = signal<string | null>(null);
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private hydration: Promise<boolean> | null = null;
  /** True once a document is open (stored draft or a start page choice). */
  private readonly hasDocumentSignal = signal(false);
  readonly hasDocument = this.hasDocumentSignal.asReadonly();
  private readonly recoveryDelayMs = 700;

  readonly newsletter = this.newsletterSignal.asReadonly();
  readonly displayName = this.displayNameSignal.asReadonly();
  readonly dirty = this.dirtySignal.asReadonly();
  readonly libraryId = this.libraryIdSignal.asReadonly();
  readonly selectedBlockId = this.selectedBlockIdSignal.asReadonly();
  readonly panelTab = this.panelTabSignal.asReadonly();
  readonly placedView = this.placedViewSignal.asReadonly();
  /** When set, the block edit modal is open for this id. */
  readonly editingBlockId = this.editingBlockIdSignal.asReadonly();
  readonly previewScrollToken = this.previewScrollTokenSignal.asReadonly();
  readonly previewScrollBlockId = this.previewScrollBlockIdSignal.asReadonly();
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
  /** URL segment of the open document: library id, or `draft` before the first save. */
  readonly routeId = computed(() => this.libraryIdSignal() ?? DRAFT_ROUTE_ID);
  /** Address of the open document at the current panel tab (and Current blocks view). */
  readonly panelPath = computed(() => editorPanelPath(this.routeId(), this.panelTabSignal(), this.placedViewSignal()));
  readonly globals = computed(() => this.newsletterSignal().globals);
  /** Colors of the set that is currently edited, previewed and exported. */
  readonly palette = computed(() => activeColors(this.globals().colors));
  /** Block shown in the inspector: the one being edited, else the selected one. */
  readonly inspectedBlock = computed((): Block | null => this.editingBlock() ?? this.selectedBlock());
  /** Effective colors of the inspected block (slot key → hex), exactly as the preview draws them. */
  readonly inspectedBlockColors = computed((): Record<string, string> => {
    const b = this.inspectedBlock();
    return b ? effectiveSlotColors(this.globals().colors, { id: b.id, type: b.type }) : {};
  });

  /**
   * Load the working draft once per app run. Resolves true when a document is open
   * (stored draft, or one chosen on the start page); false sends the user to the start page.
   */
  hydrateFromStorage(): Promise<boolean> {
    this.hydration ??= this.hydrate();
    return this.hydration;
  }

  private async hydrate(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    this.bindBeforeUnload();
    try {
      const recovered = await this.repo.loadDraft();
      if (this.hasDocumentSignal()) return true;
      if (!recovered?.newsletter) return false;
      this.applyDocument(recovered.newsletter, {
        displayName: recovered.displayName || this.unnamedDisplayName(),
        libraryId: recovered.libraryId,
        dirty: recovered.dirty,
        clearHistory: true,
      });
      return true;
    } catch {
      return this.hasDocumentSignal();
    }
  }

  /** Start page: unsaved work in progress (if any) and saved templates, newest first. */
  async recentOverview(): Promise<RecentOverview> {
    await this.hydrateFromStorage();
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
      await this.persistRecovery();
    }
    const [recovery, entries, hiddenDemos] = await Promise.all([
      this.repo.loadDraft().catch(() => null),
      this.repo.list().catch(() => [] as TemplateSummary[]),
      this.repo.hiddenDemos().catch(() => [] as SeedLanguage[]),
    ]);
    // Only real edits that are not saved: an untouched blank/demo copy or a saved, unchanged
    // newsletter is not "work" (dirty is false until the first change after create/open).
    const draft = recovery?.newsletter && recovery.dirty
      ? {
          displayName: recovery.displayName || this.unnamedDisplayName(),
          savedAt: recovery.savedAt,
          dirty: recovery.dirty,
          libraryId: recovery.libraryId,
        }
      : null;
    return { draft, saved: entries, hiddenDemos };
  }

  /** Start page: open a fresh copy (blank or demo); never touches the demo originals. */
  async startNew(kind: 'blank' | 'demo', lang: SeedLanguage): Promise<void> {
    this.endCoalesce();
    const doc = kind === 'blank' ? blankNewsletter(lang) : seedNewsletter(lang);
    this.applyDocument(doc, {
      displayName: kind === 'blank' ? this.unnamedDisplayName() : DEMO_DISPLAY_NAMES[lang],
      libraryId: null,
      dirty: false,
      clearHistory: true,
    });
    await this.persistRecovery();
  }

  /** Explicit library save (overwrite bound entry or create). */
  async saveToLibrary(opts?: { asNew?: boolean; name?: string }): Promise<boolean> {
    const name = (opts?.name ?? this.displayNameSignal()).trim() || this.unnamedDisplayName();
    let id = this.libraryIdSignal();
    if (opts?.asNew || !id) {
      id = this.newId();
    }
    // Overwriting keeps the pin; a new copy starts unpinned.
    const pinnedAt = (await this.repo.get(id).catch(() => null))?.pinnedAt;
    const entry: LibraryEntry = {
      id,
      displayName: name,
      updatedAt: new Date().toISOString(),
      newsletter: cloneNewsletter(this.newsletterSignal()),
      ...(pinnedAt ? { pinnedAt } : {}),
    };
    await this.repo.put(entry);
    void this.persistence.ensure();
    this.displayNameSignal.set(name);
    this.libraryIdSignal.set(id);
    this.dirtySignal.set(false);
    await this.persistRecovery();
    this.snackbar.success(this.i18n.t('snackbar.savedNamed').replace('{name}', name));
    return true;
  }

  async listLibraryEntries(): Promise<TemplateSummary[]> {
    return this.repo.list();
  }

  /**
   * Editor route: make the document behind `/edit/:id` current. Keeps the open draft when it
   * belongs to that id (reload); false when the template does not exist.
   */
  async openForRoute(id: string): Promise<boolean> {
    await this.hydrateFromStorage();
    if (this.hasDocumentSignal() && this.routeId() === id) return true;
    if (id === DRAFT_ROUTE_ID) return false;
    return this.openLibraryEntry(id).catch(() => false);
  }

  /** Drop unsaved changes: back to the saved version, or no open document for a never-saved draft. */
  async discardChanges(): Promise<void> {
    this.endCoalesce();
    const id = this.libraryIdSignal();
    if (id && (await this.openLibraryEntry(id).catch(() => false))) return;
    await this.repo.clearDraft().catch(() => undefined);
    this.libraryIdSignal.set(null);
    this.dirtySignal.set(false);
    this.hasDocumentSignal.set(false);
  }

  async openLibraryEntry(id: string): Promise<boolean> {
    const entry = await this.repo.get(id);
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
    await this.repo.remove(id);
    if (this.libraryIdSignal() === id) {
      this.libraryIdSignal.set(null);
      this.dirtySignal.set(true);
      await this.persistRecovery();
    }
  }

  /**
   * Start page "delete": removes the saved template and returns how to undo it. The open draft keeps
   * its changes; undo puts the entry back and, if the draft was bound to it, binds it again.
   */
  async deleteLibraryWithUndo(id: string): Promise<(() => Promise<void>) | null> {
    await this.hydrateFromStorage();
    const entry = await this.repo.get(id);
    if (!entry) return null;
    const wasBound = this.libraryIdSignal() === id;
    const wasDirty = this.dirtySignal();
    await this.deleteLibrary(id);
    return async () => {
      await this.repo.put(entry);
      if (wasBound && this.libraryIdSignal() === null) {
        this.libraryIdSignal.set(id);
        this.dirtySignal.set(wasDirty);
        await this.persistRecovery();
      }
    };
  }

  /** Pin a saved template to the start page tiles, or unpin it; its "last changed" stays. */
  async setPinned(id: string, pinned: boolean): Promise<void> {
    const entry = await this.repo.get(id);
    if (!entry) return;
    const next: LibraryEntry = { ...entry };
    if (pinned) next.pinnedAt = new Date().toISOString();
    else delete next.pinnedAt;
    await this.repo.put(next);
  }

  /** Start page "delete" on a demo tile: hides that demo and returns how to undo it. */
  async hideDemoWithUndo(lang: SeedLanguage): Promise<() => Promise<void>> {
    const hidden = await this.repo.hiddenDemos().catch(() => [] as SeedLanguage[]);
    if (!hidden.includes(lang)) await this.repo.setHiddenDemos([...hidden, lang]);
    return async () => {
      const now = await this.repo.hiddenDemos().catch(() => [] as SeedLanguage[]);
      await this.repo.setHiddenDemos(now.filter((l) => l !== lang));
    };
  }

  /** Factory reset: delete every saved template and the draft and bring the demos back; no document stays open. */
  async resetAll(): Promise<void> {
    this.endCoalesce();
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    await this.repo.clearAll();
    this.libraryIdSignal.set(null);
    this.dirtySignal.set(false);
    this.hasDocumentSignal.set(false);
    this.clearHistory();
  }

  /** Name of a newsletter that has none: "New newsletter" in the app language. */
  private unnamedDisplayName(): string {
    return this.i18n.t('doc.unnamedName');
  }

  setDisplayName(name: string): void {
    const next = name.trim() || this.unnamedDisplayName();
    if (next === this.displayNameSignal()) return;
    this.displayNameSignal.set(next);
    this.dirtySignal.set(true);
    // A rename is one deliberate step: store it now, not after the typing debounce.
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = null;
    void this.persistRecovery();
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

  /** @deprecated use saveToLibrary — kept for any leftover callers */
  save(): void {
    void this.saveToLibrary();
  }

  setPanelTab(tab: EditorPanelTab): void {
    this.panelTabSignal.set(tab);
  }

  setPlacedView(view: PlacedView): void {
    this.placedViewSignal.set(view);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(PLACED_VIEW_KEY, view);
    } catch {
      // quota / private mode
    }
  }

  private readPlacedView(): PlacedView {
    if (!isPlatformBrowser(this.platformId)) return 'list';
    try {
      return localStorage.getItem(PLACED_VIEW_KEY) === 'tree' ? 'tree' : 'list';
    } catch {
      return 'list';
    }
  }

  selectBlock(
    id: string | null,
    opts?: { revealInPanel?: boolean; scrollPreview?: boolean },
  ): void {
    this.selectedBlockIdSignal.set(id);
    // Preview / list selection opens Current blocks; catalog DnD must not steal the tab.
    if (id && opts?.revealInPanel !== false) this.panelTabSignal.set('placed');
    // Ask the editor page to smoothly scroll the iframe to this block (panel / colors picks).
    if (id && opts?.scrollPreview !== false) this.requestPreviewScroll(id);
  }

  /** Bumps a token the editor page watches to scroll the preview to a block. */
  requestPreviewScroll(id: string): void {
    this.previewScrollBlockIdSignal.set(id);
    this.previewScrollTokenSignal.update((n) => n + 1);
  }

  /** Select + open the shared block edit modal. */
  openBlockEditor(id: string): void {
    this.selectBlock(id);
    const block = this.newsletterSignal().blocks.find((b) => b.id === id) ?? null;
    this.editBaselineBlock = block ? structuredClone(block) : null;
    this.editUndoDepth = this.undoStack.length;
    this.editBaselineDirty = this.dirtySignal();
    this.paragraphEditDraft = null;
    this.editModalMinWidthSignal.set(null);
    this.editingBlockIdSignal.set(id);
  }

  /**
   * Paragraph lite editor only: keep body draft local so the iframe stays on the
   * open snapshot until Save. Other block fields still use updateBlock live.
   */
  setParagraphEditDraft(blockId: string, body: RichDoc): void {
    this.paragraphEditDraft = { blockId, body: structuredClone(body) };
  }

  /** Register/clear a flush callback from the live paragraph editor (debounce). */
  registerParagraphDraftFlush(fn: (() => void) | null): void {
    this.paragraphDraftFlush = fn;
  }

  /** Ask the open edit modal to be at least this wide (px), or clear. */
  requestEditModalMinWidth(px: number | null): void {
    this.editModalMinWidthSignal.set(px);
  }

  /** Discard in-progress field edits and close the modal. */
  cancelBlockEditor(): void {
    this.endCoalesce();
    this.paragraphDraftFlush = null;
    this.paragraphEditDraft = null;
    this.editModalMinWidthSignal.set(null);
    const baseline = this.editBaselineBlock;
    const id = this.editingBlockIdSignal();
    if (baseline && id) {
      const current = this.newsletterSignal().blocks.find((b) => b.id === id);
      // Skip no-op restore — avoids preview srcdoc reload / scroll jump when nothing changed.
      const changed =
        !current || JSON.stringify(current) !== JSON.stringify(baseline);
      if (changed) {
        this.showDiscardedNotice();
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
    // Cancel leaves the document exactly as before opening, incl. the saved/unsaved state.
    if (this.editBaselineBlock && this.dirtySignal() !== this.editBaselineDirty) {
      this.dirtySignal.set(this.editBaselineDirty);
      this.scheduleRecovery();
    }
    this.editBaselineBlock = null;
    this.editUndoDepth = 0;
    this.editingBlockIdSignal.set(null);
  }

  private showDiscardedNotice(): void {
    this.discardedNoticeSignal.set(true);
    if (this.discardedNoticeTimer) clearTimeout(this.discardedNoticeTimer);
    this.discardedNoticeTimer = setTimeout(() => {
      this.discardedNoticeSignal.set(false);
      this.discardedNoticeTimer = null;
    }, 4000);
  }

  /** Commit live edits (and paragraph draft) then close the modal. */
  saveBlockEditor(): void {
    this.endCoalesce();
    // Pull last debounced keystrokes into paragraphEditDraft before commit.
    try {
      this.paragraphDraftFlush?.();
    } catch {
      /* editor may already be tearing down */
    }
    const id = this.editingBlockIdSignal();
    const draft = this.paragraphEditDraft;
    if (draft && id && draft.blockId === id) {
      this.updateBlock(id, { body: structuredClone(draft.body) } as never, 'immediate');
      clearParagraphStash(this.libraryIdSignal(), id);
    }
    this.paragraphEditDraft = null;
    this.paragraphDraftFlush = null;
    this.editModalMinWidthSignal.set(null);
    this.editBaselineBlock = null;
    this.editUndoDepth = 0;
    this.editingBlockIdSignal.set(null);
    // Stay on the block that was just edited.
    if (id) this.requestPreviewScroll(id);
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
  /** Starting texts for new blocks in the active UI language; placed blocks never change. */
  private blockDefaultTexts(): BlockDefaultTexts {
    const t = (k: string) => this.i18n.t(`blockDefaults.${k}`);
    return {
      heroLabel: t('heroLabel'),
      heroHeadline: t('heroHeadline'),
      paragraph: t('paragraph'),
      ctaButton: t('ctaButton'),
      chapterTitle: t('chapterTitle'),
      pullQuote: t('pullQuote'),
      statNumber: t('statNumber'),
      statLabel: t('statLabel'),
      statGeo: t('statGeo'),
      benefits: [t('benefit1'), t('benefit2'), t('benefit3')],
      priceBadge: t('priceBadge'),
      pricePeriod: t('pricePeriod'),
      priceStrikeLabel: t('priceStrikeLabel'),
      priceDetails: t('priceDetails'),
      priceFine: t('priceFine'),
      ctaLinkLabel: t('ctaLinkLabel'),
      ctaLinkIntro: t('ctaLinkIntro'),
      ctaLinkText: t('ctaLinkText'),
      imageText: t('imageText'),
      greetingText: t('greetingText'),
      greetingNameLead: t('greetingNameLead'),
      testimonialQuote: t('testimonialQuote'),
      testimonialName: t('testimonialName'),
      testimonialRole: t('testimonialRole'),
      contactIntro: t('contactIntro'),
      contactName: t('contactName'),
      contactRole: t('contactRole'),
      contactPhone: t('contactPhone'),
      contactEmail: t('contactEmail'),
      contactButton: t('contactButton'),
      videoTitle: t('videoTitle'),
      videoDuration: t('videoDuration'),
      teaserTitles: [t('teaserTitle1'), t('teaserTitle2')],
      teaserText: t('teaserText'),
      teaserLink: t('teaserLink'),
      eventTitle: t('eventTitle'),
      eventLocation: t('eventLocation'),
      eventButton: t('eventButton'),
      eventCalendar: t('eventCalendar'),
      eventLocale: this.i18n.locale() === 'de' ? 'de' : 'en',
    };
  }

  insertBlockAt(
    type: Block['type'],
    index: number,
    opts?: { revealInPanel?: boolean },
  ): string {
    let createdId = '';
    this.mutateImmediate((n) => {
      const block = createBlock(type, this.blockDefaultTexts());
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
        this.paragraphEditDraft = null;
        this.paragraphDraftFlush = null;
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

  /** Change the color sets (general colors, block colors, active set) in one history step. */
  updateColors(fn: (colors: ColorsConfig) => ColorsConfig, history: HistoryMode = 'immediate'): void {
    this.mutate(history, (n) => ({
      ...n,
      globals: { ...n.globals, colors: fn(n.globals.colors) },
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

  /** Switch one header/footer part on or off in the mail. */
  setFramePartShown(part: FramePart, shown: boolean): void {
    this.mutate('immediate', (n) => {
      const hidden = (n.globals.hiddenFrameParts ?? []).filter((p) => p !== part);
      return { ...n, globals: { ...n.globals, hiddenFrameParts: shown ? hidden : [...hidden, part] } };
    });
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
    const normalized = normalizeNewsletter(n);
    this.newsletterSignal.set(normalized);
    this.hasDocumentSignal.set(true);
    this.displayNameSignal.set(meta.displayName || this.unnamedDisplayName());
    this.libraryIdSignal.set(meta.libraryId);
    this.dirtySignal.set(meta.dirty);
    this.editingBlockIdSignal.set(null);
    this.editBaselineBlock = null;
    if (meta.clearHistory) this.clearHistory();
    this.ensureSelection(normalized);
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
      await this.repo.saveDraft({
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
