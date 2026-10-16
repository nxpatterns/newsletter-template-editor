import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_PRESETS, type FontFamilyPreset } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { PersistHeightDirective } from '../../ui/persist-height.directive';
import { NewsletterSession } from '../newsletter-session.service';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';

/** Font tiles: short name plus the stack the "Aa" sample is drawn in. */
const FONT_OPTIONS: { value: FontFamilyPreset; label: string; short: string; stack: string }[] = [
  ...Object.entries(FONT_PRESETS).map(([value, meta]) => ({
    value: value as Exclude<FontFamilyPreset, 'Custom'>,
    label: meta.label,
    short: meta.label.replace(/\s*\(.*\)$/, ''),
    stack: meta.stack,
  })),
];

/** Lengths most inboxes show in full; beyond that the text gets cut. */
export const SUBJECT_MAX = 60;
export const PREHEADER_MAX = 90;

@Component({
  selector: 'app-campaign-fields',
  imports: [ClearableInputDirective, PersistHeightDirective],
  templateUrl: './campaign-fields.component.html',
  styleUrls: ['./globals-forms.component.scss', './campaign-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly fonts = FONT_OPTIONS;
  protected readonly subjectMax = SUBJECT_MAX;
  protected readonly preheaderMax = PREHEADER_MAX;

  /** Sender shown in the inbox preview: brand name, else company, else a neutral word. */
  protected readonly sender = computed(() => {
    const g = this.session.globals();
    const brand = g.brand.name.parts.map((p) => p.text).join('').trim();
    return brand || g.legal.companyName.trim() || this.i18n.t('campaign.inboxSenderFallback');
  });

  protected setFont(fontFamily: FontFamilyPreset): void {
    this.session.updateGlobals({ fontFamily }, 'immediate');
  }

  protected onString(
    key: 'preheader' | 'campaignSubject' | 'customFont' | 'exportFileNamePrefix',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateGlobals({ [key]: value }, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }
}
