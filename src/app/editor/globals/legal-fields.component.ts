import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { normalizeLinkTarget } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-legal-fields',
  templateUrl: './legal-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

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

  /** "cloudlib.eu/impressum" becomes a working https link when the field is left. */
  protected onTargetBlur(key: 'companyWebsiteHref' | 'privacyHref' | 'imprintHref'): void {
    this.session.endCoalesce();
    const built = normalizeLinkTarget(this.session.globals().legal[key] ?? '');
    if (built) this.session.updateLegal({ [key]: built }, 'immediate');
  }
}
