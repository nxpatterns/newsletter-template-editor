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
import { insertIndexForDrop, isCatalogBlockType, NTE_CATALOG_MIME } from './preview-dnd';
import { dropPlaceFromY, reorderBlockIds } from './preview-reorder';

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

  protected readonly resizing = signal(false);

  protected readonly previewSrcdoc = computed((): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(renderPreview(this.session.newsletter())),
  );

  constructor() {
    afterNextRender(() => {
      this.session.hydrateFromStorage();
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
    this.restorePreviewScroll();
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
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.effectAllowed = 'move';
      tr.classList.add('is-dragging');
      doc.body.classList.add('nte-is-dnd');
      this.session.selectBlock(id);
    };

    const readCatalogType = (event: DragEvent): string | null => {
      const dt = event.dataTransfer;
      if (!dt) return this.dragCatalogType;
      const custom = dt.getData(NTE_CATALOG_MIME);
      if (isCatalogBlockType(custom)) return custom;
      const plain = dt.getData('text/plain');
      if (plain?.startsWith('nte-catalog:')) {
        const type = plain.slice('nte-catalog:'.length);
        if (isCatalogBlockType(type)) return type;
      }
      // During dragover some browsers only expose types, not getData.
      if (Array.from(dt.types).includes(NTE_CATALOG_MIME)) return this.dragCatalogType ?? 'catalog';
      if (plain && isCatalogBlockType(plain)) return plain;
      return this.dragCatalogType;
    };

    const onDragOver = (event: DragEvent): void => {
      const target = event.target as Element | null;
      const tr = target?.closest?.('tr.nte-block') as HTMLElement | null;
      const types = event.dataTransfer ? Array.from(event.dataTransfer.types) : [];
      const reorder = this.dragMode === 'reorder' && !!this.dragSourceId;
      // Catalog drags come from the host panel (no dragSourceId). Custom MIME preferred;
      // text/plain is the fallback some browsers expose mid-drag.
      const catalogish =
        !reorder &&
        (this.dragMode === 'catalog' ||
          types.includes(NTE_CATALOG_MIME) ||
          (!this.dragSourceId && types.includes('text/plain')));

      if (!reorder && !catalogish) return;

      if (catalogish) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        doc.body.classList.add('nte-is-dnd', 'nte-is-catalog-dnd');
        this.dragMode = 'catalog';

        if (!tr) {
          this.clearDropIndicators(doc);
          doc.body.classList.add('nte-drop-append');
          this.dropTargetId = null;
          this.dropPlace = 'after';
          return;
        }

        const targetId = tr.getAttribute('data-block-id');
        if (!targetId) return;
        const rect = tr.getBoundingClientRect();
        const place = dropPlaceFromY(event.clientY, rect.top, rect.height);
        if (this.dropTargetId === targetId && this.dropPlace === place) return;
        this.clearDropIndicators(doc);
        tr.classList.add(place === 'before' ? 'nte-drop-before' : 'nte-drop-after');
        this.dropTargetId = targetId;
        this.dropPlace = place;
        return;
      }

      // Reorder existing preview blocks
      if (!tr) return;
      const targetId = tr.getAttribute('data-block-id');
      if (!targetId || targetId === this.dragSourceId) {
        this.clearDropIndicators(doc);
        this.dropTargetId = null;
        this.dropPlace = null;
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

      const rect = tr.getBoundingClientRect();
      const place = dropPlaceFromY(event.clientY, rect.top, rect.height);
      if (this.dropTargetId === targetId && this.dropPlace === place) return;

      this.clearDropIndicators(doc);
      tr.classList.add(place === 'before' ? 'nte-drop-before' : 'nte-drop-after');
      this.dropTargetId = targetId;
      this.dropPlace = place;
    };

    const onDrop = (event: DragEvent): void => {
      const catalogType = readCatalogType(event);
      if (catalogType && isCatalogBlockType(catalogType)) {
        event.preventDefault();
        event.stopPropagation();
        const ids = this.session.blocks().map((b) => b.id);
        let index = ids.length;
        if (this.dropTargetId && this.dropPlace) {
          index = insertIndexForDrop(ids, this.dropTargetId, this.dropPlace);
        }
        this.session.insertBlockAt(catalogType, index, { revealInPanel: false });
        this.suppressClickUntil = Date.now() + 400;
        this.finishDrag(doc);
        return;
      }

      // Fallback: text/plain nte-catalog:* may only be readable on drop.
      const plain = event.dataTransfer?.getData('text/plain') ?? '';
      if (plain.startsWith('nte-catalog:')) {
        const type = plain.slice('nte-catalog:'.length);
        if (isCatalogBlockType(type)) {
          event.preventDefault();
          event.stopPropagation();
          const ids = this.session.blocks().map((b) => b.id);
          let index = ids.length;
          if (this.dropTargetId && this.dropPlace) {
            index = insertIndexForDrop(ids, this.dropTargetId, this.dropPlace);
          }
          this.session.insertBlockAt(type, index, { revealInPanel: false });
          this.suppressClickUntil = Date.now() + 400;
          this.finishDrag(doc);
          return;
        }
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
      }
      this.suppressClickUntil = Date.now() + 400;
      this.finishDrag(doc);
    };

    const onDragLeave = (event: DragEvent): void => {
      // Leaving the iframe document — clear append hint when relatedTarget is null-ish.
      const related = event.relatedTarget as Node | null;
      if (related && doc.contains(related)) return;
      if (!doc.body.contains(event.target as Node)) {
        doc.body.classList.remove('nte-drop-append');
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
    doc.querySelectorAll('tr.nte-block.nte-drop-before, tr.nte-block.nte-drop-after').forEach((el) => {
      el.classList.remove('nte-drop-before', 'nte-drop-after');
    });
    doc.body.classList.remove('nte-drop-append');
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
