import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { renderPreview } from '../../../core';
import { EditorPanelComponent } from '../../editor/panel/editor-panel.component';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { ShellUiService } from '../../shell/shell-ui.service';
import { CatalogDragService } from './catalog-drag.service';
import {
  insertIndexForDrop,
  isCatalogBlockType,
  NTE_BLOCK_ID_MIME,
  NTE_CATALOG_MIME,
  resolveDropAtPoint,
} from './preview-dnd';
import { reorderBlockIds } from './preview-reorder';

type DropPlace = 'before' | 'after';
type DragMode = 'reorder' | 'catalog';

@Component({
  selector: 'app-editor-page',
  imports: [EditorPanelComponent],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly session = inject(NewsletterSession);
  protected readonly shellUi = inject(ShellUiService);
  protected readonly i18n = inject(LocaleService);
  private readonly catalogDrag = inject(CatalogDragService);

  private readonly previewFrame = viewChild<ElementRef<HTMLIFrameElement>>('previewFrame');

  /** Prevent double-binding when srcdoc reloads. */
  private previewDocWired: Document | null = null;
  private previewClickHandler: ((event: Event) => void) | null = null;
  private previewDragStartHandler: ((event: DragEvent) => void) | null = null;
  private previewDragOverHandler: ((event: DragEvent) => void) | null = null;
  private previewDropHandler: ((event: DragEvent) => void) | null = null;
  private previewDragEndHandler: ((event: DragEvent) => void) | null = null;
  private previewDragLeaveHandler: ((event: DragEvent) => void) | null = null;

  private dragMode: DragMode | null = null;
  private dragSourceId: string | null = null;
  private dragCatalogType: string | null = null;
  private dropTargetId: string | null = null;
  private dropPlace: DropPlace | null = null;
  /** Suppress the click that follows a completed drag. */
  private suppressClickUntil = 0;
  /** Last known preview document scroll (restored after srcdoc reloads). */
  private lastPreviewScrollY = 0;
  private previewScrollHandler: (() => void) | null = null;
  /** After catalog insert, scroll this block into view once the iframe reloads. */
  private pendingScrollToBlockId: string | null = null;

  protected readonly resizing = signal(false);

  protected readonly previewSrcdoc = computed((): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(renderPreview(this.session.newsletter())),
  );

  constructor() {
    afterNextRender(() => {
      this.session.hydrateFromStorage();
      // Catalog drags start on the host; Escape / drop-outside fire dragend there,
      // not inside the iframe — clear gap chrome so it cannot stick.
      document.addEventListener(
        'dragend',
        () => {
          const doc = this.previewFrame()?.nativeElement?.contentDocument;
          if (doc) this.finishDrag(doc);
        },
        true,
      );
    });

    effect(() => {
      const id = this.session.selectedBlockId();
      // Track srcdoc changes so selection chrome re-applies after re-render.
      void this.previewSrcdoc();
      queueMicrotask(() => this.applySelectedClass(id));
    });
  }

  /** iframe finished loading/parsing srcdoc — wire block chrome from the host. */
  protected onPreviewLoad(): void {
    this.wirePreviewDocument();
    this.applySelectedClass(this.session.selectedBlockId());
    if (this.pendingScrollToBlockId) {
      const id = this.pendingScrollToBlockId;
      this.pendingScrollToBlockId = null;
      this.scrollPreviewBlockIntoView(id, true);
    } else {
      this.restorePreviewScroll();
    }
  }

  protected onResizePointerDown(event: PointerEvent): void {
    if (this.shellUi.panelCollapsed()) return;
    if (event.button !== 0) return;
    event.preventDefault();
    this.resizing.set(true);
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
  }

  protected onResizePointerMove(event: PointerEvent): void {
    if (!this.resizing()) return;
    const nextWidth = window.innerWidth - event.clientX;
    this.shellUi.setPanelWidthPx(nextWidth);
  }

  protected onResizePointerUp(event: PointerEvent): void {
    if (!this.resizing()) return;
    this.resizing.set(false);
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  }

  private wirePreviewDocument(): void {
    const frame = this.previewFrame()?.nativeElement;
    const doc = frame?.contentDocument;
    if (!doc?.body) return;

    if (this.previewDocWired && this.previewDocWired !== doc) {
      this.detachPreviewListeners(this.previewDocWired);
    }

    this.injectPreviewChrome(doc);
    this.bindPreviewScroll(doc);

    if (this.previewDocWired === doc && this.previewClickHandler) {
      // Same document instance already listening.
      return;
    }

    const onClick = (event: Event): void => {
      if (Date.now() < this.suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const target = event.target as Element | null;
      if (!target?.closest) return;

      // Drag handle is for DnD only — don't treat as select.
      if (target.closest('.nte-drag-handle')) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const editBtn = target.closest('.nte-edit-btn');
      if (editBtn) {
        event.preventDefault();
        event.stopPropagation();
        const tr = editBtn.closest('tr[data-block-id]');
        const id = tr?.getAttribute('data-block-id');
        if (id) this.session.openBlockEditor(id);
        return;
      }

      const deleteBtn = target.closest('.nte-delete-btn');
      if (deleteBtn) {
        event.preventDefault();
        event.stopPropagation();
        const tr = deleteBtn.closest('tr[data-block-id]');
        const id = tr?.getAttribute('data-block-id');
        if (id) this.session.removeBlock(id);
        return;
      }

      const tr = target.closest('tr[data-block-id]');
      if (!tr) return;
      event.preventDefault();
      event.stopPropagation();
      const id = tr.getAttribute('data-block-id');
      if (id) this.session.selectBlock(id);
    };

    const onDragStart = (event: DragEvent): void => {
      const target = event.target as Element | null;
      const handle = target?.closest?.('.nte-drag-handle');
      if (!handle) return;
      const tr = handle.closest('tr.nte-block') as HTMLElement | null;
      const id = tr?.getAttribute('data-block-id');
      if (!tr || !id || !event.dataTransfer) return;

      this.dragMode = 'reorder';
      this.dragSourceId = id;
      this.dragCatalogType = null;
      this.dropTargetId = null;
      this.dropPlace = null;
      event.dataTransfer.setData(NTE_BLOCK_ID_MIME, id);
      // No text/plain — keeps block ids out of the browser address bar / new-tab search.
      event.dataTransfer.effectAllowed = 'move';
      tr.classList.add('is-dragging');
      doc.body.classList.add('nte-is-dnd');
      this.session.selectBlock(id);
    };

    const resolveCatalogType = (event: DragEvent): string | null => {
      const fromService = this.catalogDrag.activeType();
      if (fromService) return fromService;
      const dt = event.dataTransfer;
      if (!dt) return this.dragCatalogType;
      try {
        const custom = dt.getData(NTE_CATALOG_MIME);
        if (isCatalogBlockType(custom)) return custom;
      } catch {
        // getData can throw mid-drag in some engines
      }
      return this.dragCatalogType;
    };

    const markDropGap = (tr: HTMLElement, place: DropPlace): void => {
      this.clearDropIndicators(doc);
      tr.classList.add(place === 'before' ? 'nte-drop-before' : 'nte-drop-after');
      // Split neighbors so the gold gap + label is obvious.
      if (place === 'before') {
        tr.classList.add('nte-drop-open-below');
        const prev = tr.previousElementSibling as HTMLElement | null;
        if (prev?.classList.contains('nte-block')) prev.classList.add('nte-drop-open-above');
      } else {
        tr.classList.add('nte-drop-open-above');
        const next = tr.nextElementSibling as HTMLElement | null;
        if (next?.classList.contains('nte-block')) next.classList.add('nte-drop-open-below');
      }
      this.ensureInsertLabel(tr, this.i18n.t('preview.dropInsertHere'));
      this.dropTargetId = tr.getAttribute('data-block-id');
      this.dropPlace = place;
    };

    const collectBlockRects = (): {
      container: DOMRect | null;
      blocks: { id: string; top: number; bottom: number; height: number; el: HTMLElement }[];
    } => {
      const containerEl = doc.querySelector('table.email-container') as HTMLElement | null;
      const container = containerEl?.getBoundingClientRect() ?? null;
      const blocks = Array.from(doc.querySelectorAll('tr.nte-block')).map((el) => {
        const row = el as HTMLElement;
        const r = row.getBoundingClientRect();
        return {
          id: row.getAttribute('data-block-id') ?? '',
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          el: row,
        };
      }).filter((b) => b.id);
      return { container, blocks };
    };

    const showAppendAtEnd = (): void => {
      // Avoid thrashing the DOM when already in append mode.
      if (doc.body.classList.contains('nte-drop-append') && !this.dropTargetId) return;
      this.clearDropIndicators(doc);
      doc.body.setAttribute('data-nte-drop-append-label', this.i18n.t('preview.dropInsertAtEnd'));
      doc.body.classList.add('nte-drop-append');
      this.dropTargetId = null;
      this.dropPlace = 'after';
    };

    const onDragOver = (event: DragEvent): void => {
      const types = event.dataTransfer ? Array.from(event.dataTransfer.types) : [];
      const reorder = this.dragMode === 'reorder' && !!this.dragSourceId;
      const catalogish =
        !reorder &&
        (this.catalogDrag.isActive() ||
          this.dragMode === 'catalog' ||
          types.includes(NTE_CATALOG_MIME));

      if (!reorder && !catalogish) return;

      // Auto-scroll near iframe edges while dragging.
      this.autoScrollPreviewNearEdge(doc, event.clientY);

      const { container, blocks } = collectBlockRects();
      const resolved = resolveDropAtPoint(
        event.clientX,
        event.clientY,
        container,
        blocks.map(({ id, top, bottom, height }) => ({ id, top, bottom, height })),
      );

      if (catalogish) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        doc.body.classList.add('nte-is-dnd', 'nte-is-catalog-dnd');
        this.dragMode = 'catalog';
        this.dragCatalogType = resolveCatalogType(event);

        if (resolved.mode === 'append') {
          showAppendAtEnd();
          return;
        }

        const tr = blocks.find((b) => b.id === resolved.blockId)?.el;
        if (!tr) {
          showAppendAtEnd();
          return;
        }
        if (this.dropTargetId === resolved.blockId && this.dropPlace === resolved.place) return;
        markDropGap(tr, resolved.place);
        return;
      }

      // Reorder existing preview blocks — same stable geometry zones.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

      if (resolved.mode === 'append') {
        // Outside column while reordering: no gap chrome (keep dragging).
        if (this.dropTargetId) this.clearDropIndicators(doc);
        this.dropTargetId = null;
        this.dropPlace = null;
        return;
      }

      if (resolved.blockId === this.dragSourceId) {
        if (this.dropTargetId) this.clearDropIndicators(doc);
        this.dropTargetId = null;
        this.dropPlace = null;
        return;
      }

      const tr = blocks.find((b) => b.id === resolved.blockId)?.el;
      if (!tr) return;
      if (this.dropTargetId === resolved.blockId && this.dropPlace === resolved.place) return;
      markDropGap(tr, resolved.place);
    };

    const insertCatalogAtCurrentGap = (type: string): void => {
      if (!isCatalogBlockType(type)) return;
      const ids = this.session.blocks().map((b) => b.id);
      let index = ids.length;
      if (this.dropTargetId && this.dropPlace) {
        index = insertIndexForDrop(ids, this.dropTargetId, this.dropPlace);
      }
      const createdId = this.session.insertBlockAt(type, index, { revealInPanel: false });
      this.catalogDrag.accept();
      this.pendingScrollToBlockId = createdId;
      this.suppressClickUntil = Date.now() + 400;
    };

    const onDrop = (event: DragEvent): void => {
      const catalogType = resolveCatalogType(event);
      if (catalogType && isCatalogBlockType(catalogType)) {
        event.preventDefault();
        event.stopPropagation();
        insertCatalogAtCurrentGap(catalogType);
        this.finishDrag(doc);
        return;
      }

      if (!this.dragSourceId || !this.dropTargetId || !this.dropPlace) return;
      event.preventDefault();
      event.stopPropagation();

      const next = reorderBlockIds(
        this.session.blocks().map((b) => b.id),
        this.dragSourceId,
        this.dropTargetId,
        this.dropPlace,
      );
      if (next) {
        this.session.reorderBlocks(next);
        this.session.selectBlock(this.dragSourceId);
        this.pendingScrollToBlockId = this.dragSourceId;
      }
      this.suppressClickUntil = Date.now() + 400;
      this.finishDrag(doc);
    };

    const onDragLeave = (event: DragEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related && doc.contains(related)) return;
      // Leaving the iframe entirely — clear gap chrome (cancel still handled on dragend).
      if (!related || !doc.documentElement.contains(related)) {
        this.clearDropIndicators(doc);
      }
    };

    const onDragEnd = (): void => {
      this.suppressClickUntil = Date.now() + 400;
      this.finishDrag(doc);
    };

    doc.addEventListener('click', onClick, true);
    doc.addEventListener('dragstart', onDragStart, true);
    doc.addEventListener('dragover', onDragOver, true);
    doc.addEventListener('drop', onDrop, true);
    doc.addEventListener('dragend', onDragEnd, true);
    doc.addEventListener('dragleave', onDragLeave, true);

    this.previewClickHandler = onClick;
    this.previewDragStartHandler = onDragStart;
    this.previewDragOverHandler = onDragOver;
    this.previewDropHandler = onDrop;
    this.previewDragEndHandler = onDragEnd;
    this.previewDragLeaveHandler = onDragLeave;
    this.previewDocWired = doc;
    // Host-level dragover so catalog drags from the panel are recognized as they enter the iframe.
    // The iframe document still receives the events once the pointer is over it.
  }

  private detachPreviewListeners(doc: Document): void {
    if (this.previewClickHandler) doc.removeEventListener('click', this.previewClickHandler, true);
    if (this.previewDragStartHandler) {
      doc.removeEventListener('dragstart', this.previewDragStartHandler, true);
    }
    if (this.previewDragOverHandler) {
      doc.removeEventListener('dragover', this.previewDragOverHandler, true);
    }
    if (this.previewDropHandler) doc.removeEventListener('drop', this.previewDropHandler, true);
    if (this.previewDragEndHandler) {
      doc.removeEventListener('dragend', this.previewDragEndHandler, true);
    }
    if (this.previewDragLeaveHandler) {
      doc.removeEventListener('dragleave', this.previewDragLeaveHandler, true);
    }
    if (this.previewScrollHandler) {
      doc.removeEventListener('scroll', this.previewScrollHandler, true);
      this.previewScrollHandler = null;
    }
  }

  private bindPreviewScroll(doc: Document): void {
    if (this.previewScrollHandler && this.previewDocWired === doc) return;
    if (this.previewDocWired && this.previewDocWired !== doc && this.previewScrollHandler) {
      this.previewDocWired.removeEventListener('scroll', this.previewScrollHandler, true);
    }
    const onScroll = (): void => {
      const root = doc.scrollingElement ?? doc.documentElement;
      this.lastPreviewScrollY = root?.scrollTop ?? doc.body?.scrollTop ?? 0;
    };
    doc.addEventListener('scroll', onScroll, true);
    this.previewScrollHandler = onScroll;
    onScroll();
  }

  private restorePreviewScroll(): void {
    const y = this.lastPreviewScrollY;
    if (y <= 0) return;
    const doc = this.previewFrame()?.nativeElement?.contentDocument;
    if (!doc) return;
    const apply = (): void => {
      const root = doc.scrollingElement ?? doc.documentElement;
      if (root) root.scrollTop = y;
      if (doc.body) doc.body.scrollTop = y;
      doc.defaultView?.scrollTo(0, y);
    };
    apply();
    queueMicrotask(apply);
    requestAnimationFrame(apply);
  }

  private finishDrag(doc: Document): void {
    this.clearDropIndicators(doc);
    doc.querySelectorAll('tr.nte-block.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
    doc.body.classList.remove('nte-is-dnd', 'nte-is-catalog-dnd', 'nte-drop-append');
    this.dragMode = null;
    this.dragSourceId = null;
    this.dragCatalogType = null;
    this.dropTargetId = null;
    this.dropPlace = null;
  }

  private clearDropIndicators(doc: Document): void {
    doc
      .querySelectorAll(
        'tr.nte-block.nte-drop-before, tr.nte-block.nte-drop-after, tr.nte-block.nte-drop-open-above, tr.nte-block.nte-drop-open-below',
      )
      .forEach((el) => {
        el.classList.remove(
          'nte-drop-before',
          'nte-drop-after',
          'nte-drop-open-above',
          'nte-drop-open-below',
        );
      });
    doc.body.classList.remove('nte-drop-append');
    doc.body.removeAttribute('data-nte-drop-append-label');
  }

  private ensureInsertLabel(tr: HTMLElement, text: string): void {
    const td = tr.querySelector(':scope > td') ?? tr.querySelector('td');
    if (!td) return;
    let label = td.querySelector(':scope > .nte-insert-label') as HTMLElement | null;
    if (!label) {
      label = tr.ownerDocument!.createElement('div');
      label.className = 'nte-insert-label';
      label.setAttribute('aria-hidden', 'true');
      td.appendChild(label);
    }
    label.textContent = text;
  }

  private autoScrollPreviewNearEdge(doc: Document, clientY: number): void {
    const view = doc.defaultView;
    if (!view) return;
    const frame = this.previewFrame()?.nativeElement;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    const localY = clientY - frameRect.top;
    const edge = 48;
    const step = 18;
    const root = doc.scrollingElement ?? doc.documentElement;
    if (!root) return;
    if (localY < edge) root.scrollTop = Math.max(0, root.scrollTop - step);
    else if (localY > frameRect.height - edge) root.scrollTop = root.scrollTop + step;
  }

  private scrollPreviewBlockIntoView(blockId: string, flash: boolean): void {
    const doc = this.previewFrame()?.nativeElement?.contentDocument;
    if (!doc) return;
    const safe = blockId.replace(/[\\"']/g, '');
    const el = doc.querySelector(`tr.nte-block[data-block-id="${safe}"]`) as HTMLElement | null;
    if (!el) return;
    const apply = (): void => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const root = doc.scrollingElement ?? doc.documentElement;
      this.lastPreviewScrollY = root?.scrollTop ?? 0;
      if (flash) {
        el.classList.add('nte-just-inserted');
        window.setTimeout(() => el.classList.remove('nte-just-inserted'), 600);
      }
    };
    apply();
    queueMicrotask(apply);
    requestAnimationFrame(apply);
  }

  private injectPreviewChrome(doc: Document): void {
    const editLabel = this.i18n.t('preview.editBlock');
    const deleteLabel = this.i18n.t('preview.deleteBlock');
    const dragLabel = this.i18n.t('preview.dragBlock');
    const blocks = this.session.blocks();
    const indexById = new Map(blocks.map((b, i) => [b.id, i + 1]));

    doc.querySelectorAll('tr.nte-block').forEach((tr) => {
      const td = tr.querySelector(':scope > td') ?? tr.querySelector('td');
      if (!td) return;
      const blockId = tr.getAttribute('data-block-id') ?? '';
      const index = indexById.get(blockId) ?? 0;

      let badge = td.querySelector(':scope > .nte-block-index') as HTMLSpanElement | null;
      if (!badge) {
        badge = doc.createElement('span');
        badge.className = 'nte-block-index';
        badge.setAttribute('aria-hidden', 'true');
        td.appendChild(badge);
      }
      badge.textContent = index > 0 ? String(index) : '';

      let drag = td.querySelector(':scope > .nte-drag-handle') as HTMLButtonElement | null;
      if (!drag) {
        drag = doc.createElement('button');
        drag.type = 'button';
        drag.className = 'nte-drag-handle';
        drag.draggable = true;
        drag.textContent = '⋮⋮';
        td.appendChild(drag);
      }
      drag.setAttribute('aria-label', dragLabel);
      drag.title = dragLabel;
      drag.draggable = true;

      let btn = td.querySelector(':scope > .nte-edit-btn') as HTMLButtonElement | null;
      if (!btn) {
        btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'nte-edit-btn';
        btn.textContent = '✎';
        td.appendChild(btn);
      }
      btn.setAttribute('aria-label', editLabel);
      btn.title = editLabel;

      let del = td.querySelector(':scope > .nte-delete-btn') as HTMLButtonElement | null;
      if (!del) {
        del = doc.createElement('button');
        del.type = 'button';
        del.className = 'nte-delete-btn';
        del.textContent = '×';
        td.appendChild(del);
      }
      del.setAttribute('aria-label', deleteLabel);
      del.title = deleteLabel;
    });
  }

  private applySelectedClass(blockId: string | null): void {
    const doc = this.previewFrame()?.nativeElement?.contentDocument;
    if (!doc) return;
    this.injectPreviewChrome(doc);
    doc.querySelectorAll('tr.nte-block.is-selected').forEach((el) => el.classList.remove('is-selected'));
    if (!blockId) return;
    const safe = blockId.replace(/[\\\"']/g, '');
    const el = doc.querySelector(`tr.nte-block[data-block-id="${safe}"]`);
    el?.classList.add('is-selected');
  }
}
