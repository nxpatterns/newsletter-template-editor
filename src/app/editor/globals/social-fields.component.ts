import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { filledSocialNetworks, normalizeLinkTarget, resolveSlot, SOCIAL_ICON_DIR, SOCIAL_NETWORKS, type SocialNetworkId, isFramePartShown, type FramePart } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { FramePartSwitchComponent } from './frame-part-switch.component';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';
import { SOCIAL_BRAND_TILES } from './social-brand-colors';

@Component({
  selector: 'app-social-fields',
  imports: [ClearableInputDirective, FramePartSwitchComponent],
  templateUrl: './social-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly shown = (part: FramePart) => isFramePartShown(this.session.globals(), part);
  protected readonly networks = SOCIAL_NETWORKS;
  protected readonly iconDir = SOCIAL_ICON_DIR;
  /** Editor-only brand colors for the list; the strip and the export stay in Primary. */
  protected readonly brandTiles = SOCIAL_BRAND_TILES;
  /** Networks with a link, in footer order: what the strip shows. */
  /** Footer background as the preview draws it (block color over general color). */
  protected readonly footerBg = computed(() => {
    const c = this.session.globals().colors;
    return resolveSlot(c, c.mode, { id: 'footer', type: 'footer' }, 'background').hex;
  });
  protected readonly filledNetworks = computed(() => filledSocialNetworks(this.session.globals().legal.social));
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
}
