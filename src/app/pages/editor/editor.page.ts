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
import { dropPlaceFromY, reorderBlockIds } from './preview-reorder';

type DropPlace = 'before' | 'after';

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

  private dragSourceId: string | null = null;
  private dropTargetId: string | null = null;
  private dropPlace: DropPlace | null = null;
  /** Suppress the click that follows a completed drag. */
  private suppressClickUntil = 0;

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

      this.dragSourceId = id;
      this.dropTargetId = null;
      this.dropPlace = null;
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.effectAllowed = 'move';
      // Some engines need a set drag image; default is fine.
      tr.classList.add('is-dragging');
      doc.body.classList.add('nte-is-dnd');
      this.session.selectBlock(id);
    };

    const onDragOver = (event: DragEvent): void => {
      if (!this.dragSourceId) return;
      const target = event.target as Element | null;
      const tr = target?.closest?.('tr.nte-block') as HTMLElement | null;
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

    const onDragEnd = (): void => {
      this.suppressClickUntil = Date.now() + 400;
      this.finishDrag(doc);
    };

    doc.addEventListener('click', onClick, true);
    doc.addEventListener('dragstart', onDragStart, true);
    doc.addEventListener('dragover', onDragOver, true);
    doc.addEventListener('drop', onDrop, true);
    doc.addEventListener('dragend', onDragEnd, true);

    this.previewClickHandler = onClick;
    this.previewDragStartHandler = onDragStart;
    this.previewDragOverHandler = onDragOver;
    this.previewDropHandler = onDrop;
    this.previewDragEndHandler = onDragEnd;
    this.previewDocWired = doc;
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
  }

  private finishDrag(doc: Document): void {
    this.clearDropIndicators(doc);
    doc.querySelectorAll('tr.nte-block.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
    doc.body.classList.remove('nte-is-dnd');
    this.dragSourceId = null;
    this.dropTargetId = null;
    this.dropPlace = null;
  }

  private clearDropIndicators(doc: Document): void {
    doc.querySelectorAll('tr.nte-block.nte-drop-before, tr.nte-block.nte-drop-after').forEach((el) => {
      el.classList.remove('nte-drop-before', 'nte-drop-after');
    });
  }

  private injectPreviewChrome(doc: Document): void {
    const editLabel = this.i18n.t('preview.editBlock');
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
