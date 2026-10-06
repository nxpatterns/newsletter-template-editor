import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
      | 'companyLine'
      | 'privacyLabel'
      | 'privacyHref'
      | 'imprintLabel'
      | 'imprintHref'
      | 'unsubscribeLabel'
      | 'viewInBrowserLabel',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateLegal({ [key]: value });
  }
}
