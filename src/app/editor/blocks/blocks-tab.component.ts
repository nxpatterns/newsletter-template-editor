import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

const LIBRARY: readonly Block['type'][] = ['hero', 'paragraph', 'divider', 'cta-button'];

@Component({
  selector: 'app-blocks-tab',
  templateUrl: './blocks-tab.component.html',
  styleUrl: './blocks-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocksTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly library = LIBRARY;

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }
}
