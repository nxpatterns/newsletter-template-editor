import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

@Component({
  selector: 'app-colors-fields',
  templateUrl: './colors-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected onColor(
    key:
      | 'accentColor'
      | 'goldColor'
      | 'bodyTextColor'
      | 'headingColor'
      | 'pageBgColor'
      | 'contentBgColor',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateGlobals({ [key]: value }, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }
}
