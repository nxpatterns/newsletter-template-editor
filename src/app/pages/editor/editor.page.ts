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

    if (this.previewDocWired && this.previewDocWired !== doc && this.previewClickHandler) {
      this.previewDocWired.removeEventListener('click', this.previewClickHandler, true);
    }

    this.injectPreviewChrome(doc);

    if (this.previewDocWired === doc && this.previewClickHandler) {
      // Same document instance already listening.
      return;
    }

    const onClick = (event: Event): void => {
      const target = event.target as Element | null;
      if (!target?.closest) return;

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

    doc.addEventListener('click', onClick, true);
    this.previewClickHandler = onClick;
    this.previewDocWired = doc;
  }

  private injectPreviewChrome(doc: Document): void {
    const editLabel = this.i18n.t('preview.editBlock');
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
