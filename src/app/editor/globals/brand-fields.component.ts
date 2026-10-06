import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-brand-fields',
  templateUrl: './brand-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected onBrand(key: 'starsText' | 'nameHtml', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateBrand({ [key]: value }, 'coalesce');
  }

  protected onLogo(key: 'src' | 'href' | 'alt', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateLogo({ [key]: value }, 'coalesce');
  }

  protected onLogoHeight(event: Event): void {
    const heightPx = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(heightPx)) return;
    this.session.updateLogo({ heightPx }, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }
}
