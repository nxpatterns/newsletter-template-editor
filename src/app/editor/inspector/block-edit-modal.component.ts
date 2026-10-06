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
import { NewsletterSession } from '../newsletter-session.service';
import { BlockInspectorComponent } from './block-inspector.component';

@Component({
  selector: 'app-block-edit-modal',
  imports: [BlockInspectorComponent],
  templateUrl: './block-edit-modal.component.html',
  styleUrl: './block-edit-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BlockEditModalComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  /** Drives enter/leave CSS classes. Kept true while dialog is mounted. */
  protected readonly openVisual = signal(false);
  private closing = false;

  protected readonly titleText = computed(() => {
    const block = this.session.editingBlock();
    if (!block) return '';
    const blocks = this.session.blocks();
    const index = blocks.findIndex((b) => b.id === block.id);
    const n = index >= 0 ? index + 1 : 0;
    const typeLabel = this.i18n.t(`block.${block.type}`);
    return n > 0 ? `${n} · ${typeLabel}` : typeLabel;
  });

  constructor() {
    effect(() => {
      const id = this.session.editingBlockId();
      if (id) {
        this.closing = false;
        requestAnimationFrame(() => this.openVisual.set(true));
        queueMicrotask(() => this.closeBtn()?.nativeElement.focus());
      }
    });
  }

  protected onBackdropClick(): void {
    this.requestClose();
  }

  protected requestClose(): void {
    if (!this.session.editingBlockId() || this.closing) return;
    this.closing = true;
    this.openVisual.set(false);
    window.setTimeout(() => {
      this.closing = false;
      this.session.closeBlockEditor();
    }, 280);
  }

  protected onEscape(): void {
    if (this.session.editingBlockId()) this.requestClose();
  }
}
