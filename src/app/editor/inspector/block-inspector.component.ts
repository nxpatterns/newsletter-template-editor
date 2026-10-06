import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { DividerBlock } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-block-inspector',
  templateUrl: './block-inspector.component.html',
  styleUrl: './block-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockInspectorComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected onText(id: string, key: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateBlock(id, { [key]: value } as never);
  }

  protected onDividerStyle(id: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DividerBlock['style'];
    this.session.updateBlock(id, { style: value });
  }

  protected onDividerHeight(id: string, event: Event): void {
    const heightPx = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(heightPx)) return;
    this.session.updateBlock(id, { heightPx });
  }
}
