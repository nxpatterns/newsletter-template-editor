import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_VERSION } from '../environments/app-version';
import { BlockEditModalComponent } from './editor/inspector/block-edit-modal.component';
import { NewsletterSession } from './editor/newsletter-session.service';
import { LocaleService } from './i18n/locale.service';
import { ConfirmDialogComponent } from './ui/confirm-dialog/confirm-dialog.component';
import {
  LegalModalComponent,
  type LegalModalKind,
} from './ui/legal-modal/legal-modal.component';
import { FileMenuComponent } from './shell/file-menu.component';
import { SnackbarComponent } from './ui/snackbar/snackbar.component';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    SnackbarComponent,
    LegalModalComponent,
    BlockEditModalComponent,
    ConfirmDialogComponent,
    FileMenuComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
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

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      if (!this.session.canUndo()) return;
      event.preventDefault();
      this.session.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      if (!this.session.canRedo()) return;
      event.preventDefault();
      this.session.redo();
    }
  }
}
