import { computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, Injectable, signal } from '@angular/core';
import { blankNewsletter, createBlock, normalizeNewsletter, type Block, type FreeBlock, type Globals } from '../../core';
import { refuseInsert, type Refusal } from '../../core/parts/layout';
import { activeDesign, findNode, isContainer, type FreeBlockData, type LayoutNode, type TextRole } from '../../core/parts/model';
import {
  insertEmbed,
  insertPart,
  locate,
  movePart,
  movePartBy,
  quickStart,
  removePart,
  type InsertKind,
  type PartTexts,
  type QuickStart,
  type Where,
} from '../../core/parts/operations';
import { setColorMode, type ColorMode, type SlotColor } from '../../core/colors';
import {
  cloneContentOf,
  cloneWorkDocument,
  newCloneContent,
  newFreeContent,
  normalizeCloneContent,
  replaceableBlocks,
  replaceBlocksWithClone,
  sameCloneContent,
  setCloneColor,
  type CloneContent,
} from '../../core/own-blocks/clone';
import { CATALOG_TYPES } from '../editor/blocks/block-catalog';
import { NewsletterSession, SESSION_KEEPS_WORKING_DRAFT } from '../editor/newsletter-session.service';
import { OwnBlockLibrary, type OwnBlockRecord } from '../editor/own-block-library.service';
import { TEMPLATE_REPOSITORY } from '../editor/template-repository.token';
import { LocaleService } from '../i18n/locale.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

/** The template the block editor was opened from: its colors fill the preview, its name the way back. */
export interface SourceTemplate {
  /** Route id of the template (`draft` for a never saved one). */
  routeId: string;
  name: string;
  /** Address of the way back (router commands). */
  backPath: string[];
  /** True when it is the template open in the editor right now (its blocks can be replaced). */
  live: boolean;
}

export type BlockEditorStatus = 'loading' | 'ready' | 'missing';
export type BlockEditorTab = 'parts' | 'props' | 'checks';

/** What the header says about the block. */
export type BlockSaveState =
  | { kind: 'new' }
  | { kind: 'unsaved' }
  | { kind: 'draft' }
  | { kind: 'version'; number: number };

const isBuiltInType = (v: string | null): v is Block['type'] => !!v && (CATALOG_TYPES as readonly string[]).includes(v);

/** `?type=free` opens a new free block (decision 48). */
export const FREE_TYPE_PARAM = 'free';

/**
 * State of the block editor page (`/blocks/<id>`), shared by the page and its header. The block
 * is edited in its own one-block document (`work`), a separate session that never touches the
 * template's working draft; every change is a pure operation from `src/core/own-blocks/clone.ts`.
 */
@Injectable({ providedIn: 'root' })
export class BlockEditorService {
  private readonly env = inject(EnvironmentInjector);
  private readonly template = inject(NewsletterSession);
  private readonly templates = inject(TEMPLATE_REPOSITORY);
  private readonly library = inject(OwnBlockLibrary);
  private readonly i18n = inject(LocaleService);
  private readonly snackbar = inject(SnackbarService);

  /** The block's one-block document, edited by the shared block fields. */
  readonly work: NewsletterSession = createEnvironmentInjector(
    [NewsletterSession, { provide: SESSION_KEEPS_WORKING_DRAFT, useValue: false }],
    this.env,
  ).get(NewsletterSession);

  private readonly statusSignal = signal<BlockEditorStatus>('loading');
  private readonly blockIdSignal = signal<string | null>(null);
  private readonly recordSignal = signal<OwnBlockRecord | null>(null);
  private readonly sourceSignal = signal<SourceTemplate | null>(null);
  private readonly nameSignal = signal('');
  private readonly savedNameSignal = signal('');
  private readonly previewModeSignal = signal<ColorMode>('dark');
  private readonly tabSignal = signal<BlockEditorTab>('props');
  /** Content as last stored (draft or version); null for a block never saved. */
  private savedContent: CloneContent | null = null;
  /** What "unchanged" means: the content as opened or last saved (JSON of `cloneContentOf`). */
  private readonly baselineSignal = signal('');
  private readonly busySignal = signal(false);
  /** Selected part of a free block (a part id, a column id, or null for the block itself). */
  private readonly selectedPartSignal = signal<string | null>(null);
  /** Opened from "Adjust" in the Colors tab: replacing the blocks of this type starts checked (decision 33). */
  private readonly replaceByDefaultSignal = signal(false);

  readonly status = this.statusSignal.asReadonly();
  readonly blockId = this.blockIdSignal.asReadonly();
  readonly record = this.recordSignal.asReadonly();
  readonly source = this.sourceSignal.asReadonly();
  readonly replaceByDefault = this.replaceByDefaultSignal.asReadonly();
  readonly name = this.nameSignal.asReadonly();
  readonly previewMode = this.previewModeSignal.asReadonly();
  readonly tab = this.tabSignal.asReadonly();
  readonly busy = this.busySignal.asReadonly();
  readonly selectedPart = this.selectedPartSignal.asReadonly();

  readonly block = computed((): Block | null => this.work.newsletter().blocks[0] ?? null);
  readonly baseType = computed(() => this.block()?.type ?? null);
  readonly content = computed((): CloneContent | null => (this.block() ? cloneContentOf(this.work.newsletter()) : null));
  /** The free block being edited; null in clone mode. */
  readonly free = computed((): FreeBlock | null => {
    const b = this.block();
    return b?.type === 'free' ? b : null;
  });
  readonly isFree = computed(() => !!this.free());

  /** Unsaved: a field, color or the name differs from what was opened or saved (undo back = unchanged). */
  readonly hasChanges = computed(
    () =>
      JSON.stringify(this.content()) !== this.baselineSignal() || this.nameSignal().trim() !== this.savedNameSignal().trim(),
  );

  readonly saveState = computed((): BlockSaveState => {
    const record = this.recordSignal();
    if (this.hasChanges()) return { kind: 'unsaved' };
    if (!record) return { kind: 'new' };
    if (record.draft) return { kind: 'draft' };
    return { kind: 'version', number: record.block.versionCount };
  });

  /** "Save new version" once the block has one, else "Save as own block". */
  readonly hasVersion = computed(() => (this.recordSignal()?.block.versionCount ?? 0) > 0);
  /** A change, or a new copy that does not exist yet. */
  readonly canSaveDraft = computed(() => this.statusSignal() === 'ready' && (this.hasChanges() || !this.recordSignal()));
  /** Publishing is possible while anything is not a version yet: changes, a draft, or a new block. */
  readonly canPublish = computed(() => {
    if (this.statusSignal() !== 'ready') return false;
    const record = this.recordSignal();
    return this.hasChanges() || !record || !!record.draft || record.block.versionCount === 0;
  });

  constructor() {
    // Undo and redo restore older documents; the preview keeps the set the user picked.
    effect(() => {
      const mode = this.previewModeSignal();
      if (this.work.newsletter().globals.colors.mode !== mode) this.work.setColorModeQuiet(mode);
    });
  }

  /**
   * Open the block behind the address: a stored own block, or a new copy of the built-in `type`
   * (from "Adjust"; nothing is stored before the first save). `from` names the source template.
   */
  async open(id: string, opts: { from: string | null; type: string | null; replace?: string | null }): Promise<void> {
    this.blockIdSignal.set(id);
    this.replaceByDefaultSignal.set(opts.replace === 'all');
    this.statusSignal.set('loading');
    const [source, record] = await Promise.all([this.resolveSource(opts.from), this.library.open(id).catch(() => null)]);
    if (this.blockIdSignal() !== id) return;
    this.sourceSignal.set(source.info);
    let content = record?.content ?? null;
    if (!record && opts.type === FREE_TYPE_PARAM) content = newFreeContent();
    else if (!record && isBuiltInType(opts.type)) content = newCloneContent(createBlock(opts.type, this.template.blockDefaultTexts()));
    if (!content) {
      this.recordSignal.set(null);
      this.statusSignal.set('missing');
      return;
    }
    this.recordSignal.set(record);
    this.savedContent = record ? content : null;
    this.selectedPartSignal.set(null);
    const name = record?.block.name ?? this.defaultName(content);
    this.nameSignal.set(name);
    // A new copy under its suggested name is not a change yet.
    this.savedNameSignal.set(name);
    const doc = cloneWorkDocument(content, source.globals);
    this.work.loadWorkDocument({ ...doc, globals: { ...doc.globals, colors: setColorMode(doc.globals.colors, this.previewModeSignal()) } }, name);
    this.work.selectBlock(doc.blocks[0].id, { revealInPanel: false, scrollPreview: false });
    this.baselineSignal.set(JSON.stringify(this.content()));
    this.statusSignal.set('ready');
  }

  /** Leave the page: the next open starts clean. */
  close(): void {
    this.blockIdSignal.set(null);
    this.recordSignal.set(null);
    this.statusSignal.set('loading');
  }

  private defaultName(content: CloneContent): string {
    return content.kind === 'free'
      ? this.i18n.t('blockEditor.freeName')
      : this.i18n.t('blockEditor.cloneName', { type: this.i18n.t(`block.${content.block.type}`) });
  }

  // ---- Free blocks: every action is a pure operation from `src/core/parts` (decision 28). ----

  /** Select a part (or null for the block); optionally switch the side panel tab. */
  selectPart(id: string | null, tab?: BlockEditorTab): void {
    this.selectedPartSignal.set(id);
    if (tab) this.tabSignal.set(tab);
  }

  /** Change the free block in one undo step. */
  private applyFree(fn: (data: FreeBlockData) => FreeBlockData): void {
    const block = this.free();
    if (!block) return;
    this.work.applyChange((n) => {
      const current = n.blocks[0];
      if (!current || current.type !== 'free') return n;
      const next = fn(current);
      return next === current ? n : { ...n, blocks: [{ ...current, ...next, id: current.id, type: 'free' } as Block] };
    });
  }

  /** Change the free block with a design or content operation (undoable). */
  updateFree(fn: (data: FreeBlockData) => FreeBlockData): void {
    this.applyFree(fn);
  }

  partTexts(): PartTexts {
    const t = (k: string) => this.i18n.t(`blockEditor.partText.${k}`);
    return { headline: t('headline'), body: t('body'), button: t('button'), listItems: [t('item1'), t('item2')] };
  }

  /**
   * Where a new part goes by keyboard or click: into the selected container (at its end), after
   * the selected part, or at the end of the block (mockup R1: Enter inserts after the marked part).
   */
  insertPlace(): Where {
    const data = this.free();
    const sel = this.selectedPartSignal();
    if (!data) return { parent: null, index: 0 };
    const design = activeDesign(data);
    if (sel) {
      const node = findNode(design.children, sel);
      if (node && isContainer(node) && node.kind !== 'columns') {
        const list = node.kind === 'list' ? node.item : node.children;
        return { parent: node.id, index: list.length };
      }
      if (!node) {
        // A column: at its end.
        const at = this.columnEnd(data, sel);
        if (at) return at;
      }
      const place = locate(data, sel);
      if (place) return { parent: place.parent, index: place.index + 1 };
    }
    return { parent: null, index: design.children.length };
  }

  private columnEnd(data: FreeBlockData, columnId: string): Where | null {
    let hit: Where | null = null;
    const scan = (nodes: readonly LayoutNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'columns') {
          const c = n.columns.find((x) => x.id === columnId);
          if (c) hit = { parent: c.id, index: c.children.length };
          n.columns.forEach((x) => scan(x.children));
        }
        if (n.kind === 'section' || n.kind === 'box') scan(n.children);
        if (n.kind === 'list') scan(n.item);
      }
    };
    scan(activeDesign(data).children);
    return hit;
  }

  /** Why a part cannot go to a place, worded for the user; null when it can. */
  refusalText(r: Refusal): string {
    return this.i18n.t(`blockEditor.refuse.${r.reason}`, { width: r.width ?? 0, min: r.min ?? 0 });
  }

  /** Add a part (decision 82: a place below the width floor is refused with a plain reason). */
  insert(kind: InsertKind, where: Where = this.insertPlace(), role?: TextRole): boolean {
    const data = this.free();
    if (!data) return false;
    const refusal = refuseInsert(data, kind, where);
    if (refusal) {
      this.snackbar.error(this.refusalText(refusal));
      return false;
    }
    const result = insertPart(data, kind, where, this.partTexts(), role);
    if (!result.nodeId) {
      if (kind === 'column') this.snackbar.error(this.i18n.t('blockEditor.refuse.column'));
      return false;
    }
    this.applyFree(() => result.data);
    this.selectedPartSignal.set(result.nodeId);
    return true;
  }

  /** Embed an own block (its newest version) or a built-in block (decisions 38, 43). */
  insertBlock(input: { block: Block; colors?: CloneContent['colors'] }, where: Where = this.insertPlace()): boolean {
    const data = this.free();
    if (!data) return false;
    const refusal = refuseInsert(data, 'block', where, { embedded: input.block });
    if (refusal) {
      this.snackbar.error(this.refusalText(refusal));
      return false;
    }
    const result = insertEmbed(data, input, where);
    if (!result.nodeId) return false;
    this.applyFree(() => result.data);
    this.selectedPartSignal.set(result.nodeId);
    return true;
  }

  quickStart(which: QuickStart): void {
    const data = this.free();
    if (!data) return;
    const result = quickStart(data, which, this.partTexts());
    this.applyFree(() => result.data);
    this.selectedPartSignal.set(result.nodeId);
  }

  /** Move the selected part one place up or down (Alt + arrow keys). */
  moveSelected(delta: -1 | 1): void {
    const id = this.selectedPartSignal();
    if (id) this.applyFree((d) => movePartBy(d, id, delta));
  }

  /** Move a part to a place (drag and drop in the preview). */
  move(id: string, to: Where): void {
    this.applyFree((d) => movePart(d, id, to));
    this.selectedPartSignal.set(id);
  }

  /** Remove the selected part (Delete); the selection goes to its neighbour or the block. */
  removeSelected(): void {
    const data = this.free();
    const id = this.selectedPartSignal();
    if (!data || !id) return;
    const place = locate(data, id);
    const next = removePart(data, id);
    if (next === data) return;
    this.applyFree(() => next);
    let neighbour: string | null = null;
    if (place) {
      const list = place.parent === null ? activeDesign(next).children : null;
      neighbour = list?.[Math.min(place.index, list.length - 1)]?.id ?? place.parent;
    }
    this.selectedPartSignal.set(neighbour);
  }

  setName(name: string): void {
    this.nameSignal.set(name);
  }

  setTab(tab: BlockEditorTab): void {
    this.tabSignal.set(tab);
  }

  setPreviewMode(mode: ColorMode): void {
    this.previewModeSignal.set(mode);
  }

  /** One color of the copy, the same in Light and Dark; null = back to the type's default role. */
  setColor(key: string, value: SlotColor | null): void {
    this.work.updateColors((colors) => setCloneColor(colors, key, value));
  }

  /** "Save draft" (`publish` false) or "Save as own block" / "Save new version". */
  async save(publish: boolean): Promise<OwnBlockRecord | null> {
    const content = this.content();
    if (!content || this.busySignal()) return null;
    this.busySignal.set(true);
    try {
      const prev = this.recordSignal();
      const name = this.nameSignal().trim() || this.defaultName(content);
      // Nothing changed since the stored draft: publishing uses it as it is.
      const unchanged = !!prev && !!this.savedContent && sameCloneContent(content, this.savedContent) && name === prev.block.name;
      if (!publish && unchanged && prev?.draft) return prev;
      const record = await this.library.save(prev, { id: this.blockIdSignal()!, name, content, publish });
      this.recordSignal.set(record);
      this.savedContent = content;
      this.baselineSignal.set(JSON.stringify(content));
      this.nameSignal.set(record.block.name);
      this.savedNameSignal.set(record.block.name);
      this.work.markSaved();
      this.snackbar.success(
        this.i18n.t(publish ? 'blockEditor.savedVersion' : 'blockEditor.savedDraft', {
          name: record.block.name,
          n: record.block.versionCount,
        }),
      );
      return record;
    } catch {
      this.snackbar.error(this.i18n.t('blockEditor.saveFailed'));
      return null;
    } finally {
      this.busySignal.set(false);
    }
  }

  /** Blocks of the copy's type in the open template that "replace" would change (decision 49). */
  replaceableCount(): number {
    const record = this.recordSignal();
    const type = this.baseType();
    if (!record || !type || !this.sourceSignal()?.live) return 0;
    return replaceableBlocks(this.template.newsletter(), type, record.block.id).length;
  }

  /** Replace them in the open template, one undo step there. */
  replaceInTemplate(): void {
    const record = this.recordSignal();
    const content = normalizeCloneContent(record?.latest?.content);
    if (!record || !content || !this.sourceSignal()?.live) return;
    const ref = { blockId: record.block.id, version: record.block.versionCount };
    this.template.applyChange((n) => replaceBlocksWithClone(n, { content, ref }));
  }

  private async resolveSource(from: string | null): Promise<{ info: SourceTemplate | null; globals: Globals }> {
    const neutral = blankNewsletter(this.i18n.locale() === 'de' ? 'de' : 'en').globals;
    if (!from) return { info: null, globals: neutral };
    await this.template.hydrateFromStorage();
    if (this.template.hasDocument() && this.template.routeId() === from) {
      return {
        info: { routeId: from, name: this.template.displayName(), backPath: this.template.panelPath(), live: true },
        globals: this.template.globals(),
      };
    }
    const entry = await this.templates.get(from).catch(() => null);
    if (!entry) return { info: null, globals: neutral };
    return {
      info: { routeId: from, name: entry.displayName, backPath: ['/edit', from], live: false },
      globals: normalizeNewsletter(entry.newsletter).globals,
    };
  }
}
