import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../i18n/locale.service';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  protected readonly i18n = inject(LocaleService);
}
