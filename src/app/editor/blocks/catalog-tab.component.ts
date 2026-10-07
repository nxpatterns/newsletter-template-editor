import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { CatalogDragService } from '../../pages/editor/catalog-drag.service';
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
  protected readonly catalogDrag = inject(CatalogDragService);
  protected readonly types = CATALOG_TYPES;

  /** Type that just cancelled — drives return pulse on that card. */
  protected readonly cancelledType = signal<Block['type'] | null>(null);
  private cancelPulseTimer: ReturnType<typeof setTimeout> | null = null;

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
    // Custom MIME only — text/plain would leak into Chrome address bar / new-tab search.
    dt.setData(NTE_CATALOG_MIME, type);
    dt.effectAllowed = 'copy';
    this.catalogDrag.begin(type);
    this.cancelledType.set(null);
  }

  protected onDragEnd(type: Block['type'], event: DragEvent): void {
    const result = this.catalogDrag.end();
    // Escape, drop outside the app, or drop on browser chrome → cancelled.
    const dropEffect = event.dataTransfer?.dropEffect ?? 'none';
    if (result === 'cancelled' || dropEffect === 'none') {
      this.pulseCancel(type);
    }
  }

  private pulseCancel(type: Block['type']): void {
    if (this.cancelPulseTimer) clearTimeout(this.cancelPulseTimer);
    this.cancelledType.set(type);
    this.cancelPulseTimer = setTimeout(() => {
      this.cancelledType.set(null);
      this.cancelPulseTimer = null;
    }, 420);
  }
}
