import { computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, Injectable, signal } from '@angular/core';
import { blankNewsletter, createBlock, normalizeNewsletter, type Block, type Globals } from '../../core';
import { setColorMode, type ColorMode, type SlotColor } from '../../core/colors';
import {
  cloneContentOf,
  cloneWorkDocument,
  newCloneContent,
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
  private readonly busySignal = signal(false);

  readonly status = this.statusSignal.asReadonly();
  readonly blockId = this.blockIdSignal.asReadonly();
  readonly record = this.recordSignal.asReadonly();
  readonly source = this.sourceSignal.asReadonly();
  readonly name = this.nameSignal.asReadonly();
  readonly previewMode = this.previewModeSignal.asReadonly();
  readonly tab = this.tabSignal.asReadonly();
  readonly busy = this.busySignal.asReadonly();

  readonly block = computed((): Block | null => this.work.newsletter().blocks[0] ?? null);
  readonly baseType = computed(() => this.block()?.type ?? null);
  readonly content = computed((): CloneContent | null => (this.block() ? cloneContentOf(this.work.newsletter()) : null));

  /** Unsaved: a changed field or color, or a new name. */
  readonly hasChanges = computed(
    () => this.work.dirty() || this.nameSignal().trim() !== this.savedNameSignal().trim(),
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
  async open(id: string, opts: { from: string | null; type: string | null }): Promise<void> {
    this.blockIdSignal.set(id);
    this.statusSignal.set('loading');
    const [source, record] = await Promise.all([this.resolveSource(opts.from), this.library.open(id).catch(() => null)]);
    if (this.blockIdSignal() !== id) return;
    this.sourceSignal.set(source.info);
    let content = record?.content ?? null;
    if (!record && isBuiltInType(opts.type)) content = newCloneContent(createBlock(opts.type, this.template.blockDefaultTexts()));
    if (!content) {
      this.recordSignal.set(null);
      this.statusSignal.set('missing');
      return;
    }
    this.recordSignal.set(record);
    this.savedContent = record ? content : null;
    const name = record?.block.name ?? this.i18n.t('blockEditor.cloneName', { type: this.i18n.t(`block.${content.block.type}`) });
    this.nameSignal.set(name);
    // A new copy under its suggested name is not a change yet.
    this.savedNameSignal.set(name);
    const doc = cloneWorkDocument(content, source.globals);
    this.work.loadWorkDocument({ ...doc, globals: { ...doc.globals, colors: setColorMode(doc.globals.colors, this.previewModeSignal()) } }, name);
    this.work.selectBlock(doc.blocks[0].id, { revealInPanel: false, scrollPreview: false });
    this.statusSignal.set('ready');
  }

  /** Leave the page: the next open starts clean. */
  close(): void {
    this.blockIdSignal.set(null);
    this.recordSignal.set(null);
    this.statusSignal.set('loading');
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
      const name = this.nameSignal().trim() || this.i18n.t('blockEditor.cloneName', { type: this.i18n.t(`block.${content.block.type}`) });
      // Nothing changed since the stored draft: publishing uses it as it is.
      const unchanged = !!prev && !!this.savedContent && sameCloneContent(content, this.savedContent) && name === prev.block.name;
      if (!publish && unchanged && prev?.draft) return prev;
      const record = await this.library.save(prev, { id: this.blockIdSignal()!, name, content, publish });
      this.recordSignal.set(record);
      this.savedContent = content;
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
