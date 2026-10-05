import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_VERSION } from '../environments/app-version';
import { NewsletterSession } from './editor/newsletter-session.service';
import { LocaleService } from './i18n/locale.service';
import {
  LegalModalComponent,
  type LegalModalKind,
} from './ui/legal-modal/legal-modal.component';
import { SnackbarComponent } from './ui/snackbar/snackbar.component';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    SnackbarComponent,
    LegalModalComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly appVersion = APP_VERSION;

  protected readonly legalKind = signal<LegalModalKind>(null);

  protected openLegal(kind: Exclude<LegalModalKind, null>): void {
    this.legalKind.set(kind);
  }

  protected closeLegal(): void {
    this.legalKind.set(null);
  }

  protected setLocale(code: 'en' | 'de'): void {
    this.i18n.setLocale(code);
  }
}
