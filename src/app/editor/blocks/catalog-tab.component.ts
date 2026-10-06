import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { blockTypeIcon, CATALOG_TYPES } from './block-catalog';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrl: './catalog-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
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

  protected add(type: Block['type']): void {
    this.session.addBlock(type);
  }
}
