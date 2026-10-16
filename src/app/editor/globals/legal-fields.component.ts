import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { normalizeLinkTarget, isFramePartShown, REQUIRED_FRAME_PARTS, type FramePart } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { FramePartSwitchComponent } from './frame-part-switch.component';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';

@Component({
  selector: 'app-legal-fields',
  imports: [ClearableInputDirective, FramePartSwitchComponent],
  templateUrl: './legal-fields.component.html',
  styleUrls: ['./globals-forms.component.scss', './legal-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly shown = (part: FramePart) => isFramePartShown(this.session.globals(), part);
  /** Required footer links currently switched off (drives the status line). */
  protected readonly missingRequired = computed(() =>
    REQUIRED_FRAME_PARTS.filter((part) => !isFramePartShown(this.session.globals(), part)),
  );

  protected onLegal(
    key:
      | 'noticeHtml'
      | 'companyName'
      | 'companyWebsiteLabel'
      | 'companyWebsiteHref'
      | 'privacyLabel'
      | 'privacyHref'
      | 'imprintLabel'
      | 'imprintHref'
      | 'unsubscribeLabel'
      | 'viewInBrowserLabel',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateLegal({ [key]: value }, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  /** "ihrefirma.de/impressum" becomes a working https link when the field is left. */
  protected onTargetBlur(key: 'companyWebsiteHref' | 'privacyHref' | 'imprintHref'): void {
    this.session.endCoalesce();
    const built = normalizeLinkTarget(this.session.globals().legal[key] ?? '');
    if (built) this.session.updateLegal({ [key]: built }, 'immediate');
  }
}
