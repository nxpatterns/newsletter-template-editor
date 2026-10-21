import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { blockTypeHue, blockTypeIcon, type BlockTypeHue } from './block-catalog';
import { PlacedTreeComponent } from './placed-tree.component';

/** UI-only choice between list and tree (localStorage); the list is the default. */
export const PLACED_VIEW_KEY = 'newsletter-template-editor.placed-view.v1';

export type PlacedView = 'list' | 'tree';

@Component({
  selector: 'app-placed-blocks-tab',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, PlacedTreeComponent],
  templateUrl: './placed-blocks-tab.component.html',
  styleUrl: './placed-blocks-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacedBlocksTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  private readonly rootEl = viewChild<ElementRef<HTMLElement>>('placedRoot');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly view = signal<PlacedView>(this.readView());

  /** Mutable snapshot for CDK drop-list typing (session stays immutable). */
  protected readonly listData = computed((): Block[] => [...this.session.blocks()]);

  constructor() {
    effect(() => {
      const id = this.session.selectedBlockId();
      if (!id) return;
      queueMicrotask(() => this.scrollSelectedIntoView(id));
    });
  }

  protected setView(view: PlacedView): void {
    this.view.set(view);
    if (!this.browser) return;
    try {
      localStorage.setItem(PLACED_VIEW_KEY, view);
    } catch {
      // quota / private mode
    }
  }

  /** From the tree: switch to the list, where blocks are edited, with the block selected. */
  protected openInList(id: string | null): void {
    this.setView('list');
    if (id) this.session.selectBlock(id);
  }

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected hue(type: Block['type']): BlockTypeHue {
    return blockTypeHue(type);
  }

  protected onDrop(event: CdkDragDrop<Block[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.listData();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.session.reorderBlocks(next.map((b) => b.id));
  }

  private readView(): PlacedView {
    if (!this.browser) return 'list';
    try {
      return localStorage.getItem(PLACED_VIEW_KEY) === 'tree' ? 'tree' : 'list';
    } catch {
      return 'list';
    }
  }

  private scrollSelectedIntoView(id: string): void {
    const root = this.rootEl()?.nativeElement;
    if (!root) return;
    const el = root.querySelector(
      `[data-testid="placed-item-${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
