import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  Injector,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  applyColorOnDoc,
  applyLinkOnDoc,
  applyParagraphBaseColorOnDoc,
  buildLinkHref,
  detectLinkKind,
  parseLinkHref,
  type LinkKind,
  applySizeOnDoc,
  cleanAiCharsOnDoc,
  clearMarksOnDoc,
  compactDoc,
  EMAIL_CONTENT_WIDTH_PX,
  isRichColorToken,
  isRichSizeToken,
  paragraphEditorSurfaceCss,
  plainTextToRichDoc,
  RICH_COLOR_TOKENS,
  RICH_SIZE_TOKENS,
  richDocFromEditorRoot,
  richDocPlainText,
  richDocSuspiciousBreakdown,
  richDocSuspiciousCount,
  richDocToHtml,
  toggleMarkOnDoc,
  type RichColorToken,
  type RichDoc,
  type RichSizeToken,
  type RichToggleMark,
  type SuspiciousKind,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { ConfirmDialogService } from '../../ui/confirm-dialog/confirm-dialog.service';
import {
  clearParagraphStash,
  loadParagraphStash,
  paragraphStashDiffers,
  saveParagraphStash,
} from '../paragraph-draft-stash';
import { NewsletterSession } from '../newsletter-session.service';

const HISTORY_MAX = 80;

/** One format found at a clicked spot in info mode, removable from the info panel. */
interface InfoItem {
  kind: 'size' | 'color' | 'mono' | 'link' | 'paragraphColor' | InfoTagMark;
  label: string;
  el: HTMLElement;
}

/**
 * Text nodes that count toward RichDoc offsets. With paragraphs present the model
 * only reads `:scope > p`, so whitespace text between paragraphs (the `\n` joins
 * of richDocToHtml) must not count, or every later paragraph shifts by one.
 */
function countsAsDocText(root: HTMLElement, node: Node): boolean {
  return node.parentNode !== root || !root.querySelector(':scope > p');
}

/** Plain-text offset of a DOM boundary point, in RichDoc coordinates. */
function docTextOffset(root: HTMLElement, container: Node, offset: number): number {
  const boundary = document.createRange();
  boundary.setStart(container, offset);
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (node === container) {
      if (countsAsDocText(root, text)) total += offset;
      break;
    }
    if (boundary.comparePoint(text, 0) >= 0) break;
    if (countsAsDocText(root, text)) total += text.data.length;
  }
  return total;
}

/** DOM point for a RichDoc plain-text offset (inverse of docTextOffset). */
function docTextPoint(root: HTMLElement, target: number): { node: Text; offset: number } | null {
  let remaining = Math.max(0, target);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!countsAsDocText(root, text)) continue;
    last = text;
    if (remaining <= text.data.length) return { node: text, offset: remaining };
    remaining -= text.data.length;
  }
  return last ? { node: last, offset: last.data.length } : null;
}

/** Visible tag marks; (i) lists them for removal but draws no extra marker. */
type InfoTagMark = 'bold' | 'italic' | 'strike' | 'sup' | 'sub';
const INFO_TAG_MARKS: ReadonlyArray<{ mark: InfoTagMark; tags: readonly string[] }> = [
  { mark: 'bold', tags: ['STRONG', 'B'] },
  { mark: 'italic', tags: ['EM', 'I'] },
  { mark: 'strike', tags: ['S', 'STRIKE', 'DEL'] },
  { mark: 'sup', tags: ['SUP'] },
  { mark: 'sub', tags: ['SUB'] },
];
const INFO_TAG_SELECTOR = INFO_TAG_MARKS.flatMap((m) => m.tags.map((t) => t.toLowerCase())).join(',');

function tagMarkOfElement(el: HTMLElement): InfoTagMark | null {
  return INFO_TAG_MARKS.find((m) => m.tags.includes(el.tagName))?.mark ?? null;
}

/** Size/color carried by an editor element (data attribute or class from seed/paint). */
function sizeOfElement(el: HTMLElement): RichSizeToken | null {
  const data = el.getAttribute('data-rt-size');
  if (data && isRichSizeToken(data)) return data;
  for (const c of Array.from(el.classList)) {
    const t = c.startsWith('rt-size-') ? c.slice('rt-size-'.length) : '';
    if (t && isRichSizeToken(t)) return t;
  }
  return null;
}

function inlineColorOfElement(el: HTMLElement): RichColorToken | null {
  if (el.tagName !== 'SPAN') return null;
  const data = el.getAttribute('data-rt-color');
  if (data && isRichColorToken(data)) return data;
  for (const c of Array.from(el.classList)) {
    const t = c.startsWith('text-') ? c.slice('text-'.length) : '';
    if (t && isRichColorToken(t)) return t;
  }
  return null;
}

@Component({
  selector: 'app-paragraph-lite-editor',
  templateUrl: './paragraph-lite-editor.component.html',
  styleUrl: './paragraph-lite-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParagraphLiteEditorComponent implements OnDestroy {
  protected readonly i18n = inject(LocaleService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly session = inject(NewsletterSession);
  protected readonly sizes = RICH_SIZE_TOKENS;
  protected readonly colors = RICH_COLOR_TOKENS;

  /** Current document from parent. */
  readonly doc = input.required<RichDoc>();
  readonly docChange = output<RichDoc>();

  protected readonly linkOpen = signal(false);
  /** selection: link the selected words · insert: new linked text at the cursor · view/edit: existing link. */
  protected readonly linkMode = signal<'selection' | 'insert' | 'view' | 'edit'>('selection');
  protected readonly linkLabel = signal('');
  protected readonly linkKind = signal<LinkKind>('web');
  protected readonly linkAddress = signal('');
  protected readonly linkSubject = signal('');
  protected readonly linkNewTab = signal(true);
  /** Popover position inside .rt-kit, right under the text it belongs to. */
  protected readonly linkPos = signal({ top: 0, left: 0, arrow: 16 });
  protected readonly linkKinds: readonly LinkKind[] = ['web', 'email', 'phone'];
  protected readonly linkPlaceholders: Record<LinkKind, string> = {
    web: 'cloudlib.eu',
    email: 'info@cloudlib.eu',
    phone: '+49 30 1234567',
  };
  protected readonly linkHref = computed(() =>
    buildLinkHref(this.linkKind(), this.linkAddress(), this.linkSubject()),
  );
  /** Link needs a place in the text: a cursor or a selection made since the last repaint. */
  protected readonly hasCursor = signal(false);
  protected readonly suspiciousCount = signal(0);
  /** Hidden/special characters per kind, for the status line under the toolbar. */
  protected readonly suspiciousKinds = signal<Array<{ kind: SuspiciousKind; count: number }>>([]);
  /** Size and color where the selection starts; drives what the Size/Color selects show. */
  protected readonly caretFormat = signal<{ size: RichSizeToken; color: RichColorToken } | null>(null);
  protected readonly codeView = signal(false);
  protected readonly codeText = signal('');
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);
  protected readonly emailWidth = signal(false);
  protected readonly infoMode = signal(false);
  /** Formats at the spot clicked in info mode (null = panel closed). */
  protected readonly infoItems = signal<InfoItem[] | null>(null);
  /** Brief green “saved draft” flash after intermediate save. */
  protected readonly stashFlash = signal(false);
  /** Stash only when editor body differs from the committed paragraph. */
  protected readonly canStash = signal(false);

  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editor');
  private readonly kitHost = viewChild<ElementRef<HTMLDivElement>>('kit');
  private readonly linkAddressInput = viewChild<ElementRef<HTMLInputElement>>('linkAddressInput');
  private readonly injector = inject(Injector);
  private applying = false;
  private localEdit = false;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  /** Anchor currently being edited (click or selection inside link). */
  private editingAnchor: HTMLAnchorElement | null = null;
  /** Selection snapshot — selects/inputs steal focus and collapse the live selection. */
  private savedRangeValue: Range | null = null;
  private get savedRange(): Range | null {
    return this.savedRangeValue;
  }
  private set savedRange(range: Range | null) {
    this.savedRangeValue = range;
    this.hasCursor.set(!!range);
  }
  private historyPast: string[] = [];
  private historyFuture: string[] = [];
  private historySuspended = false;
  private lastSnapshot = '';
  private stashPrompted = false;
  /** True after first afterNextRender — avoids painting before #editor exists. */
  private viewReady = false;
  /** Global <style> — template <style> is stripped/scoped and never styled innerHTML. */
  private cloneStyleEl: HTMLStyleElement | null = null;
  private stashFlashTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Remember every selection made inside the editor, however it was made, so a
   * toolbar control reached by keyboard (no mousedown capture) applies to it.
   */
  private readonly trackSelection = (): void => {
    this.captureSelection();
    this.refreshCaretFormat();
  };

  constructor() {
    this.session.registerParagraphDraftFlush(() => this.flushPendingEmit());
    afterNextRender(() => {
      document.addEventListener('selectionchange', this.trackSelection);
      this.viewReady = true;
      this.syncCloneStyles();
      void this.bootstrapFromDoc(this.doc());
    });
    effect(() => {
      // Keep head stylesheet in sync with theme globals.
      this.session.globals();
      this.syncCloneStyles();
    });
    effect(() => {
      const d = this.doc();
      if (!this.viewReady) return;
      if (this.localEdit) {
        this.localEdit = false;
        return;
      }
      this.historyPast = [];
      this.historyFuture = [];
      this.canUndo.set(false);
      this.canRedo.set(false);
      this.stashPrompted = false;
      void this.bootstrapFromDoc(d);
    });
    effect(() => {
      // Keep info labels in sync when mode is on (after paints / commits).
      const on = this.infoMode();
      if (on) queueMicrotask(() => this.refreshInfoLabels());
      else queueMicrotask(() => this.clearInfoLabels());
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('selectionchange', this.trackSelection);
    if (this.debounce) clearTimeout(this.debounce);
    if (this.stashFlashTimer) clearTimeout(this.stashFlashTimer);
    this.session.registerParagraphDraftFlush(null);
    this.session.requestEditModalMinWidth(null);
    this.cloneStyleEl?.remove();
    this.cloneStyleEl = null;
  }

  /** Inject email-token CSS into document.head (survives encapsulation + innerHTML). */
  private syncCloneStyles(): void {
    if (typeof document === 'undefined') return;
    if (!this.cloneStyleEl) {
      this.cloneStyleEl = document.createElement('style');
      this.cloneStyleEl.setAttribute('data-rt-paragraph-clone', '1');
      document.head.appendChild(this.cloneStyleEl);
    }
    this.cloneStyleEl.textContent = paragraphEditorSurfaceCss(this.session.globals());
  }

  /** Force pending debounce into docChange (called by session Save). */
  flushPendingEmit(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
      this.debounce = null;
    }
    const root = this.editorHost()?.nativeElement;
    if (!root || this.applying) return;
    const next = richDocFromEditorRoot(root);
    this.commitDoc(next, false);
  }

  private async bootstrapFromDoc(d: RichDoc): Promise<void> {
    const blockId = this.session.editingBlockId();
    if (!this.stashPrompted && blockId) {
      this.stashPrompted = true;
      const stash = loadParagraphStash(this.session.libraryId(), blockId);
      if (stash) {
        if (!paragraphStashDiffers(d, stash.body)) {
          // Identical to committed — drop dead stash, never prompt.
          clearParagraphStash(this.session.libraryId(), blockId);
        } else {
          const ok = await this.confirm.confirm({
            title: this.i18n.t('rt.stashRestoreTitle'),
            body: this.i18n.t('rt.stashRestoreBody'),
            confirmLabel: this.i18n.t('rt.stashRestoreYes'),
            cancelLabel: this.i18n.t('rt.stashRestoreNo'),
          });
          if (ok) {
            this.paintFromDoc(stash.body, false);
            this.localEdit = true;
            this.docChange.emit(stash.body);
            return;
          }
          clearParagraphStash(this.session.libraryId(), blockId);
        }
      }
    }
    this.paintFromDoc(d, false);
  }

  private paintFromDoc(d: RichDoc, recordAsLast = true): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    this.applying = true;
    root.innerHTML = richDocToHtml(d, {
      forEditor: true,
      highlightSuspicious: false,
    });
    this.suspiciousCount.set(richDocSuspiciousCount(d));
    this.suspiciousKinds.set(richDocSuspiciousBreakdown(d));
    this.codeText.set(richDocToHtml(d, { forEditor: false }));
    this.lastSnapshot = JSON.stringify(d);
    this.applying = false;
    this.refreshCanStash(d);
    // Repaint replaces the DOM; panel items would point at detached nodes.
    this.infoItems.set(null);
    if (this.infoMode()) this.refreshInfoLabels();
    void recordAsLast;
  }

  protected toggleEmailWidth(): void {
    const next = !this.emailWidth();
    this.emailWidth.set(next);
    // Grow modal enough for 600px column + body padding (~1.35rem × 2) + chrome.
    this.session.requestEditModalMinWidth(
      next ? EMAIL_CONTENT_WIDTH_PX + 96 : null,
    );
  }

  /** (i) is read-only: text and editing controls lock; only Remove and Undo/Redo change content. */
  protected toggleInfoMode(): void {
    this.flushPendingEmit();
    this.infoMode.update((v) => !v);
    this.infoItems.set(null);
    if (this.infoMode()) {
      this.linkOpen.set(false);
      this.editingAnchor = null;
      this.codeView.set(false);
    }
  }

  protected stashDraft(): void {
    if (!this.canStash()) return;
    this.flushPendingEmit();
    const blockId = this.session.editingBlockId();
    const root = this.editorHost()?.nativeElement;
    if (!blockId || !root) return;
    const body = richDocFromEditorRoot(root);
    // No-op identical stash: keep storage clean and button honest.
    if (!paragraphStashDiffers(this.doc(), body)) {
      this.canStash.set(false);
      return;
    }
    saveParagraphStash(this.session.libraryId(), blockId, body);
    this.stashFlash.set(true);
    if (this.stashFlashTimer) clearTimeout(this.stashFlashTimer);
    this.stashFlashTimer = setTimeout(() => {
      this.stashFlash.set(false);
      this.stashFlashTimer = null;
    }, 1800);
  }

  /** Enable Zwischen speichern only when draft ≠ committed paragraph body. */
  private refreshCanStash(current?: RichDoc): void {
    let body = current;
    if (!body) {
      const root = this.editorHost()?.nativeElement;
      if (root && !this.applying) {
        try {
          body = richDocFromEditorRoot(root);
        } catch {
          body = undefined;
        }
      }
      if (!body && this.lastSnapshot) {
        try {
          body = JSON.parse(this.lastSnapshot) as RichDoc;
        } catch {
          body = undefined;
        }
      }
    }
    if (!body) {
      this.canStash.set(false);
      return;
    }
    this.canStash.set(paragraphStashDiffers(this.doc(), body));
  }

  private clearInfoLabels(): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    root.querySelectorAll(':scope > p[data-rt-info]').forEach((p) => {
      (p as HTMLElement).removeAttribute('data-rt-info');
    });
  }

  /**
   * Info mode labels via data-rt-info only (ignored by richDocFromEditorRoot).
   * Lists only what differs from normal; an unformatted paragraph gets no label.
   * Never injects serializable chrome nodes into the mark tree.
   */
  private refreshInfoLabels(): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const t = (k: string) => this.i18n.t(k);
    root.querySelectorAll(':scope > p').forEach((node) => {
      const p = node as HTMLElement;
      if (!this.infoMode()) {
        p.removeAttribute('data-rt-info');
        return;
      }
      const bits: string[] = [];
      const base = p.getAttribute('data-rt-color');
      if (base && base !== 'standard' && isRichColorToken(base)) {
        bits.push(`${t('rt.info.paragraphColor')}: ${t(`rt.color.${base}`)}`);
      }
      const sizes = new Set<RichSizeToken>();
      const colors = new Set<RichColorToken>();
      p.querySelectorAll<HTMLElement>('*').forEach((el) => {
        const size = sizeOfElement(el);
        if (size && size !== 'm') sizes.add(size);
        const color = inlineColorOfElement(el);
        if (color && color !== 'standard') colors.add(color);
      });
      const contains = [
        ...RICH_SIZE_TOKENS.filter((s) => sizes.has(s)).map((s) => t(`rt.size.${s}`)),
        ...RICH_COLOR_TOKENS.filter((c) => colors.has(c)).map((c) => t(`rt.color.${c}`)),
      ];
      if (p.querySelector('a.rt-link')) contains.push(t('rt.info.legendLink'));
      if (p.querySelector('code.rt-mono')) contains.push(t('rt.info.legendMono'));
      const tagMarks = new Set<InfoTagMark>();
      p.querySelectorAll<HTMLElement>(INFO_TAG_SELECTOR).forEach((el) => {
        const mark = tagMarkOfElement(el);
        if (mark) tagMarks.add(mark);
      });
      for (const { mark } of INFO_TAG_MARKS) if (tagMarks.has(mark)) contains.push(t(`rt.${mark}`));
      if (contains.length) bits.push(`${t('rt.info.contains')}: ${contains.join(', ')}`);
      if (bits.length) p.setAttribute('data-rt-info', bits.join(' · '));
      else p.removeAttribute('data-rt-info');
    });
  }

  /** Info mode click: collect formats from the clicked node up to its paragraph. */
  private openInfoPanel(start: HTMLElement): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const t = (k: string) => this.i18n.t(k);
    const items: InfoItem[] = [];
    const seen = new Set<InfoItem['kind']>();
    const add = (kind: InfoItem['kind'], label: string, el: HTMLElement) => {
      if (seen.has(kind)) return;
      seen.add(kind);
      items.push({ kind, label, el });
    };
    for (let el: HTMLElement | null = start; el && el !== root; el = el.parentElement) {
      if (el.tagName === 'P') {
        const base = el.getAttribute('data-rt-color');
        if (base && base !== 'standard' && isRichColorToken(base)) {
          add('paragraphColor', `${t('rt.info.paragraphColor')}: ${t(`rt.color.${base}`)}`, el);
        }
        break;
      }
      const size = sizeOfElement(el);
      if (size && size !== 'm') add('size', `${t('rt.size')}: ${t(`rt.size.${size}`)}`, el);
      const color = inlineColorOfElement(el);
      if (color && color !== 'standard') add('color', `${t('rt.color')}: ${t(`rt.color.${color}`)}`, el);
      if (el.tagName === 'CODE' && el.classList.contains('rt-mono')) add('mono', t('rt.info.legendMono'), el);
      if (el.tagName === 'A' && el.classList.contains('rt-link')) {
        add('link', `${t('rt.info.legendLink')}: ${el.getAttribute('href') ?? ''}`, el);
      }
      const mark = tagMarkOfElement(el);
      if (mark) add(mark, t(`rt.${mark}`), el);
    }
    this.infoItems.set(items);
  }

  protected closeInfoPanel(): void {
    this.infoItems.set(null);
  }

  /** Remove one format via the model (same path as the toolbar), then repaint. */
  protected removeInfoItem(item: InfoItem): void {
    const root = this.editorHost()?.nativeElement;
    if (!root || !root.contains(item.el)) {
      this.infoItems.set(null);
      return;
    }
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(item.el);
    sel?.removeAllRanges();
    sel?.addRange(range);
    const bm = this.captureSelectionBookmark();
    if (!bm) return;
    const doc = richDocFromEditorRoot(root);
    if (item.kind === 'paragraphColor') {
      const inside = Math.floor((bm.start + bm.end) / 2);
      const next = applyParagraphBaseColorOnDoc(doc, inside, 'standard');
      this.commitDoc(next, true, { start: inside, end: inside });
      return;
    }
    const next =
      item.kind === 'size'
        ? applySizeOnDoc(doc, bm.start, bm.end, 'm')
        : item.kind === 'color'
          ? applyColorOnDoc(doc, bm.start, bm.end, 'standard')
          : item.kind === 'link'
            ? applyLinkOnDoc(doc, bm.start, bm.end, '')
            : toggleMarkOnDoc(doc, bm.start, bm.end, item.kind);
    this.commitDoc(next, true, bm);
  }

  /** Size/color at the start of the editor selection (inline span, else paragraph, else normal). */
  private refreshCaretFormat(): void {
    const root = this.editorHost()?.nativeElement;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return;
    // A selection often starts at the very end of the text before it; use the first selected character.
    let start: Node = range.startContainer;
    if (!range.collapsed) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!range.intersectsNode(t)) continue;
        if (t === range.startContainer && range.startOffset >= (t as Text).data.length) continue;
        start = t;
        break;
      }
    }
    let size: RichSizeToken | null = null;
    let color: RichColorToken | null = null;
    for (let n: Node | null = start; n && n !== root; n = n.parentNode) {
      if (!(n instanceof HTMLElement)) continue;
      if (n.tagName === 'P') {
        const base = n.getAttribute('data-rt-color');
        if (!color && base && isRichColorToken(base)) color = base;
        break;
      }
      size ??= sizeOfElement(n);
      color ??= inlineColorOfElement(n);
    }
    this.caretFormat.set({ size: size ?? 'm', color: color ?? 'standard' });
  }

  /** Capture current selection before toolbar controls steal focus. */
  protected captureSelection(event?: Event): void {
    if (event instanceof MouseEvent && event.button === 0 && (event.currentTarget as HTMLElement)?.tagName === 'BUTTON') {
      event.preventDefault();
    }
    const root = this.editorHost()?.nativeElement;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !root) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    this.savedRange = range.cloneRange();
  }

  private restoreSelection(): boolean {
    const root = this.editorHost()?.nativeElement;
    if (!root || !this.savedRange) return false;
    try {
      root.focus();
      const sel = window.getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
      return true;
    } catch {
      return false;
    }
  }

  private refreshSavedRangeFromLive(): void {
    const root = this.editorHost()?.nativeElement;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !root) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    this.savedRange = range.cloneRange();
  }

  /**
   * Plain-text offsets into the editor — survive DOM rebuilds (undo/redo/mono unwrap)
   * so sellers can chain Bold after Mono or Undo without re-selecting.
   */
  private captureSelectionBookmark(): { start: number; end: number } | null {
    const root = this.editorHost()?.nativeElement;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    const start = docTextOffset(root, range.startContainer, range.startOffset);
    const end = docTextOffset(root, range.endContainer, range.endOffset);
    return { start, end: Math.max(start, end) };
  }

  private restoreSelectionBookmark(bm: { start: number; end: number } | null): void {
    if (!bm) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const a = docTextPoint(root, bm.start);
    const b = docTextPoint(root, bm.end);
    if (!a || !b) return;
    try {
      root.focus();
      const range = document.createRange();
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(range);
      this.savedRange = range.cloneRange();
    } catch {
      /* DOM edge */
    }
  }

  /** Keep live selection + bookmark after toolbar work (focus can steal on click). */
  private keepSelection(bm?: { start: number; end: number } | null): void {
    const mark = bm ?? this.captureSelectionBookmark();
    this.refreshSavedRangeFromLive();
    // Next frame: button click may collapse selection after our handler.
    requestAnimationFrame(() => {
      if (mark) this.restoreSelectionBookmark(mark);
      else this.restoreSelection();
    });
  }

  protected onEditorInput(): void {
    if (this.infoMode()) return;
    this.scheduleEmit();
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.infoMode()) return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const root = this.editorHost()?.nativeElement;
    if (!root) return;

    // Multi-line paste: structured paragraphs (avoids browser empty <p><br></p> spam).
    if (text.includes('\n')) {
      const incoming = plainTextToRichDoc(text);
      const current = richDocFromEditorRoot(root);
      const empty = !richDocPlainText(current).trim();
      if (empty) {
        this.commitDoc(incoming, true);
        return;
      }
      // Mid-document multi-line paste: replace whole doc only when selection covers all;
      // otherwise insert normalized text then compact+repaint.
      this.restoreSelection();
      const sel = window.getSelection();
      const selectedAll =
        !!sel &&
        !sel.isCollapsed &&
        (sel.toString().length >= richDocPlainText(current).trim().length);
      if (selectedAll) {
        this.commitDoc(incoming, true);
        return;
      }
      document.execCommand('insertText', false, text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n'));
      this.commitDoc(compactDoc(richDocFromEditorRoot(root)), true);
      return;
    }

    document.execCommand('insertText', false, text);
    this.scheduleEmit();
  }

  protected onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && event.shiftKey && !this.infoMode()) {
      event.preventDefault();
      document.execCommand('insertLineBreak');
      this.scheduleEmit();
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      event.stopPropagation();
      this.redo();
    }
  }

  protected toggleMark(cmd: 'bold' | 'italic' | 'strikeThrough' | 'superscript' | 'subscript'): void {
    if (this.infoMode()) return;
    const map: Record<typeof cmd, RichToggleMark> = {
      bold: 'bold',
      italic: 'italic',
      strikeThrough: 'strike',
      superscript: 'sup',
      subscript: 'sub',
    };
    this.applyRangeMark((doc, a, b) => toggleMarkOnDoc(doc, a, b, map[cmd]));
  }

  /** Toggle mono via RichDoc offsets (no DOM extract — spaces + toggle-off safe). */
  protected toggleMono(): void {
    if (this.infoMode()) return;
    this.applyRangeMark((doc, a, b) => toggleMarkOnDoc(doc, a, b, 'mono'));
  }

  protected applySize(event: Event): void {
    if (this.infoMode()) return;
    const select = event.target as HTMLSelectElement;
    const size = select.value as RichSizeToken;
    if (!size) return;
    this.applyRangeMark((doc, a, b) => applySizeOnDoc(doc, a, b, size), { allowCollapsed: false });
    this.resyncSelect(select, 'size');
  }

  /**
   * After an apply, show what the text really has now (a refused apply, e.g. size on a
   * bare caret, must not leave the select claiming a value the text does not have).
   */
  private resyncSelect(select: HTMLSelectElement, which: 'size' | 'color'): void {
    requestAnimationFrame(() => {
      this.refreshCaretFormat();
      select.value = this.caretFormat()?.[which] ?? '';
    });
  }

  /**
   * Single Color control: non-collapsed selection → span color mark;
   * collapsed caret → paragraph base color.
   */
  protected onColorChange(event: Event): void {
    if (this.infoMode()) return;
    const select = event.target as HTMLSelectElement;
    const raw = select.value;
    if (!raw) return;
    const color = raw as RichColorToken;
    this.focusEditor();
    if (!this.restoreSelection()) {
      const savedBm = this.bookmarkFromSavedRange();
      if (savedBm) this.restoreSelectionBookmark(savedBm);
    }
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const bm = this.captureSelectionBookmark() ?? this.bookmarkFromSavedRange();
    if (!bm) {
      select.selectedIndex = 0;
      return;
    }
    const doc = richDocFromEditorRoot(root);
    const collapsed = bm.start === bm.end;
    const next = collapsed
      ? applyParagraphBaseColorOnDoc(doc, bm.start, color)
      : applyColorOnDoc(doc, bm.start, bm.end, color);
    if (JSON.stringify(doc) !== JSON.stringify(next)) {
      this.commitDoc(next, true, collapsed ? { start: bm.start, end: bm.start } : bm);
    } else {
      this.keepSelection(bm);
    }
    this.resyncSelect(select, 'color');
  }

  /**
   * Shared path: bookmark → model transform → repaint + restore selection.
   * Prefer this over contenteditable extractContents for mark surgery.
   */
  private applyRangeMark(
    fn: (doc: RichDoc, start: number, end: number) => RichDoc,
    opts?: { allowCollapsed?: boolean },
  ): void {
    this.focusEditor();
    if (!this.restoreSelection()) {
      const savedBm = this.bookmarkFromSavedRange();
      if (savedBm) this.restoreSelectionBookmark(savedBm);
    }
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const bm = this.captureSelectionBookmark() ?? this.bookmarkFromSavedRange();
    if (!bm) return;
    if (opts?.allowCollapsed === false && bm.start === bm.end) {
      this.keepSelection(bm);
      return;
    }
    this.restoreSelectionBookmark(bm);
    const doc = richDocFromEditorRoot(root);
    const next = fn(doc, bm.start, bm.end);
    if (JSON.stringify(doc) === JSON.stringify(next)) {
      this.keepSelection(bm);
      return;
    }
    this.commitDoc(next, true, bm);
  }

  protected openLink(): void {
    if (this.infoMode()) return;
    const root = this.editorHost()?.nativeElement;
    const range = this.savedRange;
    if (!root || !range || !root.contains(range.commonAncestorContainer)) return;
    const anchor = this.findLinkFromSelection();
    if (anchor) {
      this.openLinkPopover(anchor);
      return;
    }
    this.editingAnchor = null;
    this.linkMode.set(range.collapsed ? 'insert' : 'selection');
    const selected = range.toString();
    this.linkLabel.set(range.collapsed ? '' : selected);
    const guess = range.collapsed ? null : detectLinkKind(selected);
    this.setLinkFields(guess ?? 'web', guess ? selected.trim() : '', '', true);
    this.showLinkPopover(range.getBoundingClientRect());
  }

  protected onEditorClick(event: MouseEvent): void {
    this.captureSelection();
    const t = event.target as HTMLElement | null;
    if (this.infoMode()) {
      // Read-only: a link click explains the link instead of opening the link editor.
      if (t?.closest?.('a')) event.preventDefault();
      if (t) this.openInfoPanel(t);
      return;
    }
    const anchor = t?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor || !this.editorHost()?.nativeElement.contains(anchor)) return;
    event.preventDefault();
    event.stopPropagation();
    this.openLinkPopover(anchor);
  }

  /** Existing link: compact view first, Edit opens the form. */
  private openLinkPopover(anchor: HTMLAnchorElement): void {
    this.editingAnchor = anchor;
    this.linkMode.set('view');
    this.linkLabel.set(anchor.textContent ?? '');
    const parsed = parseLinkHref(anchor.getAttribute('href') || '');
    this.setLinkFields(parsed.kind, parsed.address, parsed.subject, anchor.getAttribute('target') !== '_self');
    this.showLinkPopover(anchor.getBoundingClientRect());
  }

  private setLinkFields(kind: LinkKind, address: string, subject: string, newTab: boolean): void {
    this.linkKind.set(kind);
    this.linkAddress.set(address);
    this.linkSubject.set(subject);
    this.linkNewTab.set(newTab);
  }

  /** Place the popover under the given text rect (clamped to the editor kit) and focus the address. */
  private showLinkPopover(rect: DOMRect): void {
    const kit = this.kitHost()?.nativeElement;
    if (kit) {
      const box = kit.getBoundingClientRect();
      const width = Math.min(352, box.width);
      const left = Math.max(0, Math.min(rect.left - box.left - 16, box.width - width));
      const arrow = Math.max(12, Math.min(rect.left - box.left - left + Math.min(rect.width, 40) / 2, width - 24));
      this.linkPos.set({ top: rect.bottom - box.top + 10, left, arrow });
    }
    this.linkOpen.set(true);
    this.revealLinkPopover();
    if (this.linkMode() !== 'view') this.focusLinkAddress();
  }

  /** The modal body scrolls; keep the whole popover in view whenever it opens or grows. */
  private revealLinkPopover(): void {
    afterNextRender(
      () => this.kitHost()?.nativeElement.querySelector('.rt-link-pop')?.scrollIntoView({ block: 'nearest' }),
      { injector: this.injector },
    );
  }

  /** Existing link in words: the web address, the email address (and subject), or the number. */
  protected linkViewText(): string {
    const kind = this.linkKind();
    if (kind === 'web') return this.linkHref() ?? this.linkAddress();
    const subject = kind === 'email' ? this.linkSubject().trim() : '';
    return subject ? `${this.linkAddress()} · ${subject}` : this.linkAddress();
  }

  private focusLinkAddress(): void {
    afterNextRender(() => this.linkAddressInput()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }

  protected onLinkAddressInput(value: string): void {
    this.linkAddress.set(value);
    const kind = detectLinkKind(value);
    if (kind && kind !== this.linkKind()) this.linkKind.set(kind);
    this.revealLinkPopover();
  }

  protected chooseLinkKind(kind: LinkKind): void {
    this.linkKind.set(kind);
    this.revealLinkPopover();
    this.focusLinkAddress();
  }

  protected editLink(): void {
    this.linkMode.set('edit');
    this.revealLinkPopover();
    this.focusLinkAddress();
  }

  /** What the link will do, in words; null while the address is incomplete. */
  protected linkHint(): { ok: boolean; text: string } | null {
    const href = this.linkHref();
    if (!this.linkAddress().trim()) return null;
    if (!href) return { ok: false, text: this.i18n.t(`rt.linkForm.invalid.${this.linkKind()}`) };
    const kind = this.linkKind();
    const shown = kind === 'web' ? href : href.replace(/^(mailto|tel):/, '').split('?')[0];
    return { ok: true, text: this.i18n.t(`rt.linkForm.opens.${kind}`, { target: shown }) };
  }

  protected onLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelLink();
    } else if (event.key === 'Enter' && this.linkMode() !== 'view') {
      event.preventDefault();
      this.applyLink();
    }
  }

  private findLinkFromSelection(): HTMLAnchorElement | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      if (this.savedRange) {
        const n = this.savedRange.commonAncestorContainer;
        const el = n.nodeType === Node.ELEMENT_NODE ? (n as HTMLElement) : n.parentElement;
        return (el?.closest('a') as HTMLAnchorElement | null) ?? null;
      }
      return null;
    }
    const node = sel.anchorNode;
    if (!node) return null;
    const el =
      node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    return (el?.closest('a') as HTMLAnchorElement | null) ?? null;
  }

  protected applyLink(): void {
    if (this.infoMode()) return;
    const href = this.linkHref();
    const root = this.editorHost()?.nativeElement;
    if (!href || !root) return;
    const target = this.linkKind() === 'web' && this.linkNewTab() ? '_blank' : '_self';
    const mode = this.linkMode();
    this.linkOpen.set(false);
    this.focusEditor();

    if (mode === 'selection') {
      // Through the model, so bold/italic inside the selection survive.
      const bm = this.bookmarkFromSavedRange();
      this.editingAnchor = null;
      if (!bm || bm.start === bm.end) return;
      const doc = richDocFromEditorRoot(root);
      this.commitDoc(applyLinkOnDoc(doc, bm.start, bm.end, href, target), true, bm);
      return;
    }

    if (mode === 'edit' && this.editingAnchor && root.contains(this.editingAnchor)) {
      const a = this.editingAnchor;
      a.setAttribute('href', href);
      a.setAttribute('target', target);
      if (target === '_blank') a.setAttribute('rel', 'noopener noreferrer');
      else a.removeAttribute('rel');
      a.classList.add('rt-link', 'text-secondary');
      const label = this.linkLabel().trim();
      if (label && label !== a.textContent) a.textContent = label;
    } else if (mode === 'insert') {
      const range = this.savedRange;
      if (!range || !root.contains(range.commonAncestorContainer)) return;
      const a = document.createElement('a');
      a.href = href;
      a.target = target;
      if (target === '_blank') a.rel = 'noopener noreferrer';
      a.className = 'rt-link text-secondary';
      a.textContent = this.linkLabel().trim() || this.linkAddress().trim();
      range.insertNode(a);
      this.ensureLinkSpacing(a);
      const after = document.createRange();
      after.setStartAfter(a);
      after.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);
      this.savedRange = after.cloneRange();
    }
    this.editingAnchor = null;
    this.scheduleEmit(true);
  }

  /** Avoid link text gluing to the following word when no space exists. */
  private ensureLinkSpacing(a: HTMLAnchorElement): void {
    const next = a.nextSibling;
    if (!next) return;
    if (next.nodeType === Node.TEXT_NODE) {
      const t = next.textContent ?? '';
      if (t && !/^\s/.test(t) && !/^[,.;:!?)\]}]/.test(t)) {
        next.textContent = ' ' + t;
      }
      return;
    }
    if (next.nodeType === Node.ELEMENT_NODE) {
      const el = next as HTMLElement;
      if (el.tagName === 'BR') return;
      a.after(document.createTextNode(' '));
    }
  }

  protected removeLink(): void {
    if (this.infoMode()) return;
    this.focusEditor();
    if (this.editingAnchor && this.editorHost()?.nativeElement.contains(this.editingAnchor)) {
      const a = this.editingAnchor;
      const text = document.createTextNode(a.textContent ?? '');
      a.replaceWith(text);
      this.editingAnchor = null;
      this.linkOpen.set(false);
      this.scheduleEmit(true);
      return;
    }
    this.restoreSelection();
    document.execCommand('unlink', false);
    this.linkOpen.set(false);
    this.editingAnchor = null;
    this.scheduleEmit(true);
  }

  protected cancelLink(): void {
    this.linkOpen.set(false);
    this.editingAnchor = null;
  }

  protected async clearFormatting(): Promise<void> {
    if (this.infoMode()) return;
    const ok = await this.confirm.confirm({
      title: this.i18n.t('rt.clearConfirmTitle'),
      body: this.i18n.t('rt.clearConfirmBody'),
      confirmLabel: this.i18n.t('rt.clear'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
    if (!ok) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const next = clearMarksOnDoc(richDocFromEditorRoot(root));
    this.commitDoc(next, true);
  }

  protected removeAiChars(): void {
    if (this.infoMode()) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const next = cleanAiCharsOnDoc(richDocFromEditorRoot(root));
    this.commitDoc(next, true);
  }

  protected toggleCodeView(): void {
    if (this.infoMode()) return;
    const next = !this.codeView();
    if (next) {
      const root = this.editorHost()?.nativeElement;
      if (root) {
        const d = richDocFromEditorRoot(root);
        this.codeText.set(richDocToHtml(d, { forEditor: false }));
      }
    }
    this.codeView.set(next);
  }

  protected undo(): void {
    if (!this.historyPast.length) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    // Prefer live selection; fall back to last toolbar snapshot.
    const bm = this.captureSelectionBookmark() ?? this.bookmarkFromSavedRange();
    const current = JSON.stringify(richDocFromEditorRoot(root));
    const prev = this.historyPast.pop()!;
    this.historyFuture.push(current);
    this.historySuspended = true;
    const doc = JSON.parse(prev) as RichDoc;
    this.commitDoc(doc, true, bm);
    this.historySuspended = false;
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
  }

  protected redo(): void {
    if (!this.historyFuture.length) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const bm = this.captureSelectionBookmark() ?? this.bookmarkFromSavedRange();
    const current = JSON.stringify(richDocFromEditorRoot(root));
    const next = this.historyFuture.pop()!;
    this.historyPast.push(current);
    this.historySuspended = true;
    const doc = JSON.parse(next) as RichDoc;
    this.commitDoc(doc, true, bm);
    this.historySuspended = false;
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
  }

  private bookmarkFromSavedRange(): { start: number; end: number } | null {
    if (!this.savedRange) return null;
    const root = this.editorHost()?.nativeElement;
    if (!root || !root.contains(this.savedRange.commonAncestorContainer)) return null;
    try {
      const r = this.savedRange;
      const start = docTextOffset(root, r.startContainer, r.startOffset);
      return { start, end: Math.max(start, docTextOffset(root, r.endContainer, r.endOffset)) };
    } catch {
      return null;
    }
  }

  private focusEditor(): void {
    this.editorHost()?.nativeElement.focus();
  }

  private scheduleEmit(immediate = false): void {
    if (this.applying) return;
    if (this.debounce) clearTimeout(this.debounce);
    const run = () => {
      const root = this.editorHost()?.nativeElement;
      if (!root) return;
      const next = richDocFromEditorRoot(root);
      // DOM is already correct — do not repaint (would drop selection).
      this.commitDoc(next, false);
    };
    if (immediate) run();
    else this.debounce = setTimeout(run, 120);
  }

  /**
   * @param repaint When true, rewrite editor HTML from model (undo/clear).
   *                When false, keep live DOM (typing / toolbar marks).
   * @param restoreBm Optional plain-text bookmark to re-select after repaint.
   */
  private commitDoc(
    next: RichDoc,
    repaint: boolean,
    restoreBm?: { start: number; end: number } | null,
  ): void {
    const snap = JSON.stringify(next);
    if (!this.historySuspended && this.lastSnapshot && this.lastSnapshot !== snap) {
      this.historyPast.push(this.lastSnapshot);
      if (this.historyPast.length > HISTORY_MAX) this.historyPast.shift();
      this.historyFuture = [];
    }
    this.lastSnapshot = snap;
    if (repaint) {
      this.applying = true;
      const root = this.editorHost()?.nativeElement;
      if (root) {
        root.innerHTML = richDocToHtml(next, { forEditor: true, highlightSuspicious: false });
      }
      this.applying = false;
      this.savedRange = null;
      // Repaint replaces the DOM; panel items would point at detached nodes.
      this.infoItems.set(null);
      if (restoreBm) {
        this.restoreSelectionBookmark(restoreBm);
        requestAnimationFrame(() => this.restoreSelectionBookmark(restoreBm));
      }
      if (this.infoMode()) this.refreshInfoLabels();
    }
    this.suspiciousCount.set(richDocSuspiciousCount(next));
    this.suspiciousKinds.set(richDocSuspiciousBreakdown(next));
    this.codeText.set(richDocToHtml(next, { forEditor: false }));
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
    this.refreshCanStash(next);
    this.localEdit = true;
    this.docChange.emit(next);
  }
}
