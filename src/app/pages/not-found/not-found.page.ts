import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocaleService } from '../../i18n/locale.service';

/** What was not found: any address, or a template that no longer exists. */
export type NotFoundKind = 'page' | 'template';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly i18n = inject(LocaleService);
  private readonly route = inject(ActivatedRoute).snapshot;
  protected readonly kind: NotFoundKind = this.route.data['kind'] ?? 'page';
  /** `/edit/<id>/<unknown place>`: the template itself still has an address. */
  protected readonly docId =
    this.kind === 'page' && this.route.url[0]?.path === 'edit' ? (this.route.url[1]?.path ?? null) : null;
}
