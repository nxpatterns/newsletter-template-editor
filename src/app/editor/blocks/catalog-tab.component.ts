import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NTE_CATALOG_MIME } from '../../pages/editor/preview-dnd';
import { blockTypeIcon, CATALOG_TYPES } from './block-catalog';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrl: './catalog-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly types = CATALOG_TYPES;

  protected label(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected hint(type: Block['type']): string {
    return this.i18n.t(`block.${type}.hint`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  /** Catalog cards are palette items: drag into the preview. Click is intentionally inert. */
  protected onDragStart(type: Block['type'], event: DragEvent): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.setData(NTE_CATALOG_MIME, type);
    // text/plain fallback for engines that strip custom MIME types mid-drag
    dt.setData('text/plain', `nte-catalog:${type}`);
    dt.effectAllowed = 'copy';
  }
}
