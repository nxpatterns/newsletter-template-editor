import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { blockTypeIcon } from './block-catalog';

@Component({
  selector: 'app-placed-blocks-tab',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './placed-blocks-tab.component.html',
  styleUrl: './placed-blocks-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacedBlocksTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  /** Mutable snapshot for CDK drop-list typing (session stays immutable). */
  protected readonly listData = computed((): Block[] => [...this.session.blocks()]);

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected onDrop(event: CdkDragDrop<Block[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.listData();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.session.reorderBlocks(next.map((b) => b.id));
  }
}
