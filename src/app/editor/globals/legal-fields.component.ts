import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { normalizeLinkTarget, SOCIAL_ICON_DIR, SOCIAL_NETWORKS, type SocialNetworkId } from '../../../core';
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
  protected readonly networks = SOCIAL_NETWORKS;
  protected readonly iconDir = SOCIAL_ICON_DIR;
  protected readonly placeholders: Record<SocialNetworkId, string> = {
    linkedin: 'linkedin.com/company/…',
    facebook: 'facebook.com/…',
    instagram: 'instagram.com/…',
    x: 'x.com/…',
    youtube: 'youtube.com/@…',
    tiktok: 'tiktok.com/@…',
    threads: 'threads.net/@…',
    pinterest: 'pinterest.com/…',
    vimeo: 'vimeo.com/…',
    dailymotion: 'dailymotion.com/…',
    snapchat: 'snapchat.com/add/…',
    whatsapp: 'wa.me/…',
  };

  protected onSocial(id: SocialNetworkId, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateLegal({ social: { ...this.session.globals().legal.social, [id]: value } }, 'coalesce');
  }

  /** "linkedin.com/company/x" becomes a working https link when the field is left. */
  protected onSocialBlur(id: SocialNetworkId): void {
    this.session.endCoalesce();
    const social = this.session.globals().legal.social;
    const built = normalizeLinkTarget(social[id] ?? '');
    if (built) this.session.updateLegal({ social: { ...social, [id]: built } }, 'immediate');
  }

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
