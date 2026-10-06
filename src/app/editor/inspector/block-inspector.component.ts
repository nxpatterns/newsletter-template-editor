import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { CtaLinkListBlock, DividerBlock } from '../../../core';
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
    this.session.updateBlock(id, { [key]: value } as never, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  protected onDividerStyle(id: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DividerBlock['style'];
    this.session.updateBlock(id, { style: value }, 'immediate');
  }

  protected onDividerHeight(id: string, event: Event): void {
    const heightPx = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(heightPx)) return;
    this.session.updateBlock(id, { heightPx }, 'coalesce');
  }

  protected onBenefits(id: string, event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value;
    const items = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    this.session.updateBlock(id, { items }, 'coalesce');
  }

  protected ctaLinksJson(block: CtaLinkListBlock): string {
    return JSON.stringify(block.items, null, 2);
  }

  protected onCtaLinksJson(id: string, event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value;
    try {
      const parsed = JSON.parse(raw) as CtaLinkListBlock['items'];
      if (!Array.isArray(parsed)) return;
      this.session.updateBlock(id, { items: parsed }, 'coalesce');
    } catch {
      // keep typing until JSON is valid
    }
  }
}
