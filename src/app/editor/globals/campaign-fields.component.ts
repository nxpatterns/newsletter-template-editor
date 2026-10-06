import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FONT_PRESETS, type FontFamilyPreset } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

const FONT_OPTIONS: { value: FontFamilyPreset; label: string }[] = [
  ...Object.entries(FONT_PRESETS).map(([value, meta]) => ({
    value: value as Exclude<FontFamilyPreset, 'Custom'>,
    label: meta.label,
  })),
  { value: 'Custom', label: 'Custom…' },
];

@Component({
  selector: 'app-campaign-fields',
  templateUrl: './campaign-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly fonts = FONT_OPTIONS;

  protected onString(
    key: 'preheader' | 'campaignSubject' | 'customFont' | 'exportFileNamePrefix',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateGlobals({ [key]: value });
  }

  protected onFont(event: Event): void {
    const fontFamily = (event.target as HTMLSelectElement).value as FontFamilyPreset;
    this.session.updateGlobals({ fontFamily });
  }
}
