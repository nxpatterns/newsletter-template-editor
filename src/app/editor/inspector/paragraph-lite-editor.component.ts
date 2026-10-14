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
  clearMarksOnDoc,
  RICH_COLOR_TOKENS,
  RICH_SIZE_TOKENS,
  richDocFromEditorRoot,
  richDocSuspiciousCount,
  richDocToHtml,
  type RichColorToken,
  type RichDoc,
  type RichSizeToken,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';

@Component({
  selector: 'app-paragraph-lite-editor',
  templateUrl: './paragraph-lite-editor.component.html',
  styleUrl: './paragraph-lite-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParagraphLiteEditorComponent implements OnDestroy {
  protected readonly i18n = inject(LocaleService);
  protected readonly sizes = RICH_SIZE_TOKENS;
  protected readonly colors = RICH_COLOR_TOKENS;

  /** Current document from parent. */
  readonly doc = input.required<RichDoc>();
  readonly docChange = output<RichDoc>();

  protected readonly showSuspicious = signal(false);
  protected readonly linkOpen = signal(false);
  protected readonly linkLabel = signal('');
  protected readonly linkHref = signal('');
  protected readonly linkTarget = signal<'_blank' | '_self'>('_blank');
  protected readonly suspiciousCount = signal(0);

  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editor');
  private applying = false;
  private localEdit = false;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  /** Anchor currently being edited (click or selection inside link). */
  private editingAnchor: HTMLAnchorElement | null = null;

  constructor() {
    afterNextRender(() => this.paintFromDoc(this.doc()));
    effect(() => {
      const d = this.doc();
      if (this.localEdit) {
        this.localEdit = false;
        return;
      }
      this.paintFromDoc(d);
    });
  }

  ngOnDestroy(): void {
    if (this.debounce) clearTimeout(this.debounce);
  }

  private paintFromDoc(d: RichDoc): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    this.applying = true;
    root.innerHTML = richDocToHtml(d, {
      forEditor: true,
      highlightSuspicious: this.showSuspicious(),
    });
    this.suspiciousCount.set(richDocSuspiciousCount(d));
    this.applying = false;
  }

  protected onEditorInput(): void {
    this.scheduleEmit();
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.scheduleEmit();
  }

  protected toggleMark(cmd: 'bold' | 'italic' | 'strikeThrough' | 'superscript' | 'subscript'): void {
    this.focusEditor();
    document.execCommand(cmd, false);
    this.scheduleEmit(true);
  }

  protected applySize(size: RichSizeToken): void {
    this.wrapSelection('span', {
      class: size === 'body' ? '' : `rt-size-${size}`,
      'data-rt-size': size,
    });
  }

  protected applyColor(color: RichColorToken): void {
    this.wrapSelection('span', {
      class: `text-${color}`,
      'data-rt-color': color,
    });
  }

  protected applyParagraphColor(color: RichColorToken | ''): void {
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

  /** Toolbar link button: edit existing link under caret/selection, or create from selection. */
  protected openLink(): void {
    const anchor = this.findLinkFromSelection() ?? this.editingAnchor;
    this.openLinkPopover(anchor);
  }

  /** Click inside editor: if target is a link, open editor instead of navigating. */
  protected onEditorClick(event: MouseEvent): void {
    const t = event.target as HTMLElement | null;
    const anchor = t?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor || !this.editorHost()?.nativeElement.contains(anchor)) return;
    event.preventDefault();
    event.stopPropagation();
    this.openLinkPopover(anchor);
  }

  private openLinkPopover(anchor: HTMLAnchorElement | null): void {
    const sel = window.getSelection();
    const selected = sel?.toString() ?? '';
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
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    const el =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node.parentElement;
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
      // Avoid nested links: unwrap selection anchors first.
      document.execCommand('unlink', false);
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        document.execCommand('createLink', false, url);
        const a =
          this.findLinkFromSelection() ||
          (root?.querySelector(`a[href="${CSS.escape(url)}"]`) as HTMLAnchorElement | null);
        if (a) {
          a.setAttribute('target', target);
          if (target === '_blank') a.setAttribute('rel', 'noopener noreferrer');
          a.classList.add('rt-link', 'text-accent');
          if (label && label !== (a.textContent ?? '')) a.textContent = label;
        }
      } else if (label) {
        // No selection: insert new link with label at caret
        const a = document.createElement('a');
        a.href = url;
        a.target = target;
        if (target === '_blank') a.rel = 'noopener noreferrer';
        a.className = 'rt-link text-accent';
        a.textContent = label;
        const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
        if (range) {
          range.deleteContents();
          range.insertNode(a);
          range.setStartAfter(a);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } else {
          root?.appendChild(a);
        }
      }
    }

    this.linkOpen.set(false);
    this.editingAnchor = null;
    this.scheduleEmit(true);
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
    document.execCommand('unlink', false);
    this.linkOpen.set(false);
    this.editingAnchor = null;
    this.scheduleEmit(true);
  }

  protected cancelLink(): void {
    this.linkOpen.set(false);
    this.editingAnchor = null;
  }

  protected clearFormatting(): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const next = clearMarksOnDoc(richDocFromEditorRoot(root));
    this.applying = true;
    root.innerHTML = richDocToHtml(next, {
      forEditor: true,
      highlightSuspicious: this.showSuspicious(),
    });
    this.applying = false;
    this.suspiciousCount.set(richDocSuspiciousCount(next));
    this.localEdit = true;
    this.docChange.emit(next);
  }

  protected toggleSuspicious(): void {
    const root = this.editorHost()?.nativeElement;
    if (!root) return;
    const current = richDocFromEditorRoot(root);
    this.showSuspicious.update((v) => !v);
    this.applying = true;
    root.innerHTML = richDocToHtml(current, {
      forEditor: true,
      highlightSuspicious: this.showSuspicious(),
    });
    this.applying = false;
    this.suspiciousCount.set(richDocSuspiciousCount(current));
  }

  protected insertSoftBreak(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key === 'Enter' && ke.shiftKey) {
      ke.preventDefault();
      document.execCommand('insertLineBreak');
      this.scheduleEmit();
    }
  }

  private wrapSelection(tag: string, attrs: Record<string, string>): void {
    this.focusEditor();
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
      this.suspiciousCount.set(richDocSuspiciousCount(next));
      this.localEdit = true;
      this.docChange.emit(next);
    };
    if (immediate) run();
    else this.debounce = setTimeout(run, 120);
  }
}
