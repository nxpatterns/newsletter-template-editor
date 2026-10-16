import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';

@Component({
  selector: 'app-merge-fields',
  imports: [ClearableInputDirective],
  templateUrl: './merge-fields.component.html',
  styleUrl: './globals-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MergeFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected onSample(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateSample(key, value);
  }
}
