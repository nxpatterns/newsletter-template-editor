import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { emailSizeReport, GMAIL_CLIP_BYTES, renderExportOptimized } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

const kb = (bytes: number) => Math.round(bytes / 1024);

/** How much of Gmail's ~102 KB the exported HTML uses, split into text/layout and embedded images. */
@Component({
  selector: 'app-email-size-meter',
  template: `
    @if (report(); as r) {
      <div class="ed-label-row">
        <span class="ed-label" [textContent]="i18n.t('image.meter.title')"></span>
        <span class="ed-count" [class.is-over]="r.totalBytes > limit" data-testid="email-size-total"
          [textContent]="kb(r.totalBytes) + ' KB / ' + kb(limit) + ' KB'"></span>
      </div>
      <div class="meter" aria-hidden="true">
        <i [style.width.%]="pct(r.totalBytes - r.embeddedBytes)"></i>
        <b [style.width.%]="pct(r.embeddedBytes)"></b>
      </div>
      <p class="ed-hint">
        <span [textContent]="i18n.t('image.meter.text', { kb: kb(r.totalBytes - r.embeddedBytes) })"></span>
        &ngsp;·&ngsp;
        <span class="is-embedded" [textContent]="i18n.t('image.meter.embedded', { kb: kb(r.embeddedBytes) })"></span>
        &ngsp;·&ngsp;
        <span [textContent]="i18n.t('image.meter.limit')"></span>
      </p>
    }
  `,
  styleUrl: './email-size-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailSizeMeterComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  protected readonly limit = GMAIL_CLIP_BYTES;
  protected readonly kb = kb;

  /** Same HTML as the export (logo already scaled down), so the number matches what is sent. */
  private readonly measured = resource({
    params: () => this.session.newsletter(),
    loader: async ({ params }) => emailSizeReport((await renderExportOptimized(params)).full),
  });

  protected readonly report = computed(() => (this.measured.hasValue() ? this.measured.value() : null));

  protected pct(bytes: number): number {
    return Math.min(100, (bytes / this.limit) * 100);
  }
}
