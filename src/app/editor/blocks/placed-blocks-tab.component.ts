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
  viewChild,
} from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { OwnBlockLibrary } from '../own-block-library.service';
import type { PlacedView } from '../panel/panel-routes';
import { blockTypeHue, blockTypeIcon, type BlockTypeHue } from './block-catalog';
import { PlacedTreeComponent } from './placed-tree.component';

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
  private readonly ownBlocks = inject(OwnBlockLibrary);

  private readonly rootEl = viewChild<ElementRef<HTMLElement>>('placedRoot');

  protected readonly view = this.session.placedView;

  /** Mutable snapshot for CDK drop-list typing (session stays immutable). */
  protected readonly listData = computed((): Block[] => [...this.session.blocks()]);

  constructor() {
    void this.ownBlocks.refresh();
    effect(() => {
      const id = this.session.selectedBlockId();
      if (!id) return;
      queueMicrotask(() => this.scrollSelectedIntoView(id));
    });
  }

  protected setView(view: PlacedView): void {
    this.session.setPlacedView(view);
  }

  /** From the tree: switch to the list, where blocks are edited, with the block selected. */
  protected openInList(id: string | null): void {
    this.setView('list');
    if (id) this.session.selectBlock(id);
  }

  /** An own block shows its own name; one deleted from the library keeps the type name. */
  protected label(block: Block): string {
    const own = block.own ? this.ownBlocks.entry(block.own.blockId) : undefined;
    return own?.block.name ?? this.blockLabel(block.type);
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

  private scrollSelectedIntoView(id: string): void {
    const root = this.rootEl()?.nativeElement;
    if (!root) return;
    const el = root.querySelector(
      `[data-testid="placed-item-${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
