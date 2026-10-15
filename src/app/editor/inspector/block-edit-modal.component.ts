import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { ShellUiService } from '../../shell/shell-ui.service';
import { NewsletterSession } from '../newsletter-session.service';
import { BlockInspectorComponent } from './block-inspector.component';

const DEFAULT_W = 720;
const DEFAULT_H = 560;
const MIN_W = 360;
const MIN_H = 280;

/** Short editors open as tall as their content; the rest keep the fixed default height. */
const FIT_HEIGHT_TYPES = new Set(['hero', 'cta-button', 'stat-box', 'chapter-band', 'pull-quote', 'divider']);

@Component({
  selector: 'app-block-edit-modal',
  imports: [BlockInspectorComponent],
  templateUrl: './block-edit-modal.component.html',
  styleUrl: './block-edit-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'onWindowResize()',
  },
})
export class BlockEditModalComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly shellUi = inject(ShellUiService);

  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  private readonly dialogEl = viewChild<ElementRef<HTMLElement>>('dialog');

  protected readonly openVisual = signal(false);
  private closing = false;
  private closeAction: 'save' | 'cancel' = 'cancel';

  /** h null = as tall as the content (until the user resizes by hand). */
  protected readonly geo = signal<{ x: number; y: number; w: number; h: number | null }>({
    x: 80,
    y: 80,
    w: DEFAULT_W,
    h: DEFAULT_H,
  });

  private drag:
    | { mode: 'move'; ox: number; oy: number; sx: number; sy: number }
    | { mode: 'resize'; ox: number; oy: number; sw: number; sh: number }
    | null = null;

  /** Last block id that received open-once Cancel focus (avoid steal on re-runs). */
  private focusedOpenId: string | null = null;

  protected readonly titleText = computed(() => {
    const block = this.session.editingBlock();
    if (!block) return '';
    const blocks = this.session.blocks();
    const index = blocks.findIndex((b) => b.id === block.id);
    const n = index >= 0 ? index + 1 : 0;
    const typeLabel = this.i18n.t(`block.${block.type}`);
    return n > 0 ? `${n} · ${typeLabel}` : typeLabel;
  });

  protected readonly dialogStyle = computed(() => {
    const g = this.geo();
    return {
      left: `${g.x}px`,
      top: `${g.y}px`,
      width: `${g.w}px`,
      height: g.h === null ? null : `${g.h}px`,
    };
  });

  constructor() {
    effect(() => {
      const id = this.session.editingBlockId();
      const block = this.session.editingBlock();
      if (!id || !block) {
        this.focusedOpenId = null;
        return;
      }
      // Open chrome only when the edit session id changes — not on every
      // editingBlock() content update (typing would re-run this effect).
      if (id === this.focusedOpenId) return;
      this.focusedOpenId = id;
      this.closing = false;
      this.closeAction = 'cancel';
      this.restoreGeometry(block.type);
      requestAnimationFrame(() => this.openVisual.set(true));
      queueMicrotask(() => this.cancelBtn()?.nativeElement.focus());
    });
    // Paragraph “Email width” may request a wider dialog so the 600px clone fits.
    effect(() => {
      const minW = this.session.editModalMinWidth();
      if (minW == null || !this.session.editingBlockId()) return;
      const g = this.geo();
      const w = Math.max(MIN_W, Math.min(window.innerWidth - 16, Math.max(g.w, minW)));
      if (w === g.w) return;
      this.geo.set({
        ...g,
        w,
        x: this.clampX(g.x, w),
      });
    });
  }

  /** Outside click must not dismiss — only Cancel / Save / Escape. */
  protected onBackdropClick(): void {
    /* intentional no-op */
  }

  /** Keep dialog inside the viewport after zoom / window resize. */
  protected onWindowResize(): void {
    if (!this.session.editingBlockId()) return;
    const g = this.geo();
    const w = Math.max(MIN_W, Math.min(g.w, window.innerWidth - 16));
    const h = g.h === null ? null : Math.max(MIN_H, Math.min(g.h, window.innerHeight - 16));
    this.geo.set({
      w,
      h,
      x: this.clampX(g.x, w),
      y: this.clampY(g.y, h ?? this.renderedHeight()),
    });
  }

  protected requestCancel(): void {
    this.beginClose('cancel');
  }

  protected requestSave(): void {
    this.beginClose('save');
  }

  protected onEscape(): void {
    if (this.session.editingBlockId()) this.requestCancel();
  }

  protected onHeadPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const g = this.geo();
    this.drag = { mode: 'move', ox: event.clientX, oy: event.clientY, sx: g.x, sy: g.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  protected onResizePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const g = this.geo();
    this.drag = { mode: 'resize', ox: event.clientX, oy: event.clientY, sw: g.w, sh: g.h ?? this.renderedHeight() };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  protected onHeadPointerMove(event: PointerEvent): void {
    if (!this.drag || this.drag.mode !== 'move') return;
    const dx = event.clientX - this.drag.ox;
    const dy = event.clientY - this.drag.oy;
    const g = this.geo();
    this.geo.set({
      ...g,
      x: this.clampX(this.drag.sx + dx, g.w),
      y: this.clampY(this.drag.sy + dy, g.h ?? this.renderedHeight()),
    });
  }

  protected onResizePointerMove(event: PointerEvent): void {
    if (!this.drag || this.drag.mode !== 'resize') return;
    const dx = event.clientX - this.drag.ox;
    const dy = event.clientY - this.drag.oy;
    const g = this.geo();
    const w = Math.max(MIN_W, Math.min(window.innerWidth - 16, this.drag.sw + dx));
    const h = Math.max(MIN_H, Math.min(window.innerHeight - 16, this.drag.sh + dy));
    this.geo.set({
      ...g,
      w,
      h,
      x: this.clampX(g.x, w),
      y: this.clampY(g.y, h),
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.drag) return;
    this.drag = null;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    this.persistGeometry();
  }

  private restoreGeometry(blockType: string): void {
    const saved = this.shellUi.getBlockModalGeometry(blockType);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit = FIT_HEIGHT_TYPES.has(blockType);
    if (saved) {
      // Older saves stored the untouched default height; treat that as "never resized".
      const h = saved.h === null || (fit && saved.h === DEFAULT_H) ? (fit ? null : DEFAULT_H) : saved.h;
      this.geo.set({
        w: Math.max(MIN_W, Math.min(saved.w, vw - 16)),
        h: h === null ? null : Math.max(MIN_H, Math.min(h, vh - 16)),
        x: this.clampX(saved.x, saved.w),
        y: this.clampY(saved.y, h ?? MIN_H),
      });
      return;
    }
    const w = Math.min(DEFAULT_W, vw - 32);
    const h = Math.min(DEFAULT_H, vh - 32);
    this.geo.set({
      w,
      h: fit ? null : h,
      x: Math.max(16, Math.round((vw - w) / 2)),
      // Same top edge as the fixed-height dialog, so short editors do not jump around.
      y: Math.max(16, Math.round((vh - h) / 2)),
    });
  }

  private persistGeometry(): void {
    const block = this.session.editingBlock();
    if (!block) return;
    this.shellUi.setBlockModalGeometry(block.type, this.geo());
  }

  private renderedHeight(): number {
    return this.dialogEl()?.nativeElement.offsetHeight || DEFAULT_H;
  }

  private clampX(x: number, w: number): number {
    const max = Math.max(8, window.innerWidth - w - 8);
    return Math.min(max, Math.max(8, Math.round(x)));
  }

  private clampY(y: number, h: number): number {
    const max = Math.max(8, window.innerHeight - h - 8);
    return Math.min(max, Math.max(8, Math.round(y)));
  }

  private beginClose(action: 'save' | 'cancel'): void {
    if (!this.session.editingBlockId() || this.closing) return;
    this.persistGeometry();
    this.closing = true;
    this.closeAction = action;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      if (this.closeAction === 'save') this.session.saveBlockEditor();
      else this.session.cancelBlockEditor();
    }, 280);
  }
}
