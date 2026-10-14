import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  cleanAiCharsOnDoc,
  clearMarksOnDoc,
  compactDoc,
  plainTextToRichDoc,
  RICH_COLOR_TOKENS,
  RICH_SIZE_TOKENS,
  richDocFromEditorRoot,
  richDocPlainText,
  richDocSuspiciousCount,
  richDocToHtml,
  type RichColorToken,
  type RichDoc,
  type RichSizeToken,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { ConfirmDialogService } from '../../ui/confirm-dialog/confirm-dialog.service';

const HISTORY_MAX = 80;

@Component({
  selector: 'app-paragraph-lite-editor',
  templateUrl: './paragraph-lite-editor.component.html',
  styleUrl: './paragraph-lite-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParagraphLiteEditorComponent implements OnDestroy {
  protected readonly i18n = inject(LocaleService);
  private readonly confirm = inject(ConfirmDialogService);
  protected readonly sizes = RICH_SIZE_TOKENS;
  protected readonly colors = RICH_COLOR_TOKENS;

  /** Current document from parent. */
  readonly doc = input.required<RichDoc>();
  readonly docChange = output<RichDoc>();

  protected readonly linkOpen = signal(false);
  protected readonly linkLabel = signal('');
  protected readonly linkHref = signal('');
  protected readonly linkTarget = signal<'_blank' | '_self'>('_blank');
  protected readonly suspiciousCount = signal(0);
  protected readonly codeView = signal(false);
  protected readonly codeText = signal('');
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);

  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editor');
  private applying = false;
  private localEdit = false;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  /** Anchor currently being edited (click or selection inside link). */
  private editingAnchor: HTMLAnchorElement | null = null;
  /** Selection snapshot — selects/inputs steal focus and collapse the live selection. */
  private savedRange: Range | null = null;
  private historyPast: string[] = [];
  private historyFuture: string[] = [];
  private historySuspended = false;
  private lastSnapshot = '';

  constructor() {
    afterNextRender(() => this.paintFromDoc(this.doc(), false));
    effect(() => {
      const d = this.doc();
      if (this.localEdit) {
        this.localEdit = false;
        return;
      }
      this.historyPast = [];
      this.historyFuture = [];
      this.canUndo.set(false);
      this.canRedo.set(false);
      this.paintFromDoc(d, false);
    });
  }

  ngOnDestroy(): void {
    if (this.debounce) clearTimeout(this.debounce);
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
    this.codeText.set(richDocToHtml(d, { forEditor: false }));
    if (recordAsLast) this.lastSnapshot = JSON.stringify(d);
    else this.lastSnapshot = JSON.stringify(d);
    this.applying = false;
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

  protected onEditorInput(): void {
    this.scheduleEmit();
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
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
    if (event.key === 'Enter' && event.shiftKey) {
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
    this.restoreSelection();
    this.focusEditor();
    document.execCommand(cmd, false);
    this.refreshSavedRangeFromLive();
    this.scheduleEmit(true);
  }

  protected toggleMono(): void {
    this.restoreSelection();
    this.wrapSelection('code', { class: 'rt-mono' });
  }

  protected applySize(size: RichSizeToken, selectEl?: HTMLSelectElement): void {
    if (!size) return;
    this.restoreSelection();
    this.applyTokenMark('size', size);
    if (selectEl) selectEl.selectedIndex = 0;
  }

  /**
   * Single Color control: non-collapsed selection → span color mark;
   * collapsed caret → paragraph base color.
   */
  protected onColorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const raw = select.value;
    if (!raw) return;
    const color = raw as RichColorToken;
    this.restoreSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      this.applyTokenMark('color', color);
    } else {
      this.applyParagraphColor(color);
    }
    select.selectedIndex = 0;
  }

  /**
   * Replace (not nest) size/color marks on the current selection.
   * Extracts the range, strips prior token attrs, wraps once, reselects.
   */
  private applyTokenMark(kind: 'size' | 'color', value: string): void {
    this.focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const frag = range.extractContents();
    this.stripTokenFromFragment(frag, kind);

    const isNeutral =
      (kind === 'size' && value === 'body') || (kind === 'color' && value === 'body');

    if (isNeutral) {
      range.insertNode(frag);
      this.refreshSavedRangeFromLive();
      this.scheduleEmit(true);
      return;
    }

    const span = document.createElement('span');
    if (kind === 'size') {
      span.className = `rt-size-${value}`;
      span.setAttribute('data-rt-size', value);
    } else {
      span.className = `text-${value}`;
      span.setAttribute('data-rt-color', value);
    }
    span.appendChild(frag);
    range.insertNode(span);
    const next = document.createRange();
    next.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(next);
    this.savedRange = next.cloneRange();
    this.scheduleEmit(true);
  }

  private stripTokenFromFragment(root: DocumentFragment | Node, kind: 'size' | 'color'): void {
    const walk = (node: Node): void => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (kind === 'size') {
        el.removeAttribute('data-rt-size');
        for (const c of Array.from(el.classList)) {
          if (c.startsWith('rt-size-')) el.classList.remove(c);
        }
      } else {
        el.removeAttribute('data-rt-color');
        for (const c of ['text-body', 'text-heading', 'text-accent', 'text-gold', 'text-dim']) {
          el.classList.remove(c);
        }
      }
      Array.from(el.childNodes).forEach(walk);
      if (
        el.tagName === 'SPAN' &&
        !el.className.trim() &&
        !el.getAttribute('data-rt-size') &&
        !el.getAttribute('data-rt-color') &&
        el.childNodes.length
      ) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      }
    };
    Array.from(root.childNodes).forEach(walk);
  }

  private applyParagraphColor(color: RichColorToken | ''): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const sel = window.getSelection();
    let p: HTMLElement | null = null;
    if (sel?.anchorNode) {
      p =
        sel.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement).closest('p')
          : sel.anchorNode.parentElement?.closest('p') ?? null;
    }
    if (!p) p = root.querySelector('p');
    if (!p) return;
    if (color) {
      p.setAttribute('data-rt-color', color);
      p.classList.remove('text-body', 'text-heading', 'text-accent', 'text-gold', 'text-dim');
      p.classList.add(`text-${color}`);
    } else {
      p.removeAttribute('data-rt-color');
      p.classList.remove('text-heading', 'text-accent', 'text-gold', 'text-dim');
      p.classList.add('text-body');
    }
    this.scheduleEmit(true);
  }

  protected openLink(): void {
    this.restoreSelection();
    this.captureSelection();
    const anchor = this.findLinkFromSelection() ?? this.editingAnchor;
    this.openLinkPopover(anchor);
  }

  protected onEditorClick(event: MouseEvent): void {
    this.captureSelection();
    const t = event.target as HTMLElement | null;
    const anchor = t?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor || !this.editorHost()?.nativeElement.contains(anchor)) return;
    event.preventDefault();
    event.stopPropagation();
    this.openLinkPopover(anchor);
  }

  private openLinkPopover(anchor: HTMLAnchorElement | null): void {
    const sel = window.getSelection();
    const selected = sel?.toString() ?? this.savedRange?.toString() ?? '';
    if (anchor) {
      this.editingAnchor = anchor;
      this.linkLabel.set(anchor.textContent ?? '');
      this.linkHref.set(anchor.getAttribute('href') || '');
      this.linkTarget.set(anchor.getAttribute('target') === '_self' ? '_self' : '_blank');
    } else {
      this.editingAnchor = null;
      this.linkLabel.set(selected || '');
      this.linkHref.set(selected.startsWith('http') ? selected : '');
      this.linkTarget.set('_blank');
    }
    this.linkOpen.set(true);
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

  private normalizeUrl(href: string): string | null {
    const h = href.trim();
    if (!h || /^javascript:/i.test(h)) return null;
    if (h.includes('://') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#'))
      return h;
    return `https://${h}`;
  }

  protected applyLink(): void {
    const url = this.normalizeUrl(this.linkHref());
    const label = this.linkLabel().trim();
    if (!url) {
      this.linkOpen.set(false);
      this.editingAnchor = null;
      return;
    }
    const target = this.linkTarget();
    const root = this.editorHost()?.nativeElement;
    this.focusEditor();

    if (this.editingAnchor && root?.contains(this.editingAnchor)) {
      const a = this.editingAnchor;
      a.setAttribute('href', url);
      a.setAttribute('target', target);
      if (target === '_blank') a.setAttribute('rel', 'noopener noreferrer');
      else a.removeAttribute('rel');
      a.classList.add('rt-link', 'text-accent');
      if (label) a.textContent = label;
    } else {
      this.restoreSelection();
      const sel = window.getSelection();
      const range =
        this.savedRange && root
          ? this.savedRange
          : sel && sel.rangeCount
            ? sel.getRangeAt(0)
            : null;

      const a = document.createElement('a');
      a.href = url;
      a.target = target;
      if (target === '_blank') a.rel = 'noopener noreferrer';
      a.className = 'rt-link text-accent';
      a.textContent = label || range?.toString() || url;

      if (range && root?.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(a);
        this.ensureLinkSpacing(a);
        const after = document.createRange();
        after.setStartAfter(a);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        this.savedRange = after.cloneRange();
      } else if (root) {
        const p = root.querySelector('p') ?? root;
        p.appendChild(a);
      }
    }

    this.linkOpen.set(false);
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
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const next = cleanAiCharsOnDoc(richDocFromEditorRoot(root));
    this.commitDoc(next, true);
  }

  protected toggleCodeView(): void {
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
    const current = JSON.stringify(richDocFromEditorRoot(root));
    const prev = this.historyPast.pop()!;
    this.historyFuture.push(current);
    this.historySuspended = true;
    const doc = JSON.parse(prev) as RichDoc;
    this.commitDoc(doc, true);
    this.historySuspended = false;
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
  }

  protected redo(): void {
    if (!this.historyFuture.length) return;
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const current = JSON.stringify(richDocFromEditorRoot(root));
    const next = this.historyFuture.pop()!;
    this.historyPast.push(current);
    this.historySuspended = true;
    const doc = JSON.parse(next) as RichDoc;
    this.commitDoc(doc, true);
    this.historySuspended = false;
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
  }

  private wrapSelection(tag: string, attrs: Record<string, string>): void {
    this.focusEditor();
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v) el.setAttribute(k, v);
    }
    try {
      range.surroundContents(el);
    } catch {
      const frag = range.extractContents();
      el.appendChild(frag);
      range.insertNode(el);
    }
    const next = document.createRange();
    next.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(next);
    this.savedRange = next.cloneRange();
    this.scheduleEmit(true);
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
   */
  private commitDoc(next: RichDoc, repaint: boolean): void {
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
    }
    this.suspiciousCount.set(richDocSuspiciousCount(next));
    this.codeText.set(richDocToHtml(next, { forEditor: false }));
    this.canUndo.set(this.historyPast.length > 0);
    this.canRedo.set(this.historyFuture.length > 0);
    this.localEdit = true;
    this.docChange.emit(next);
  }
}
