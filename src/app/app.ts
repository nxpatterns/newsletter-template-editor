import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { APP_VERSION } from '../environments/app-version';
import { BlockEditorFlow } from './blocks/block-editor-flow.service';
import { BlockEditorHeaderComponent } from './blocks/block-editor-header.component';
import { BlockEditorService } from './blocks/block-editor.service';
import { BlockEditModalComponent } from './editor/inspector/block-edit-modal.component';
import { NewsletterSession } from './editor/newsletter-session.service';
import { LocaleService } from './i18n/locale.service';
import { ConfirmDialogComponent } from './ui/confirm-dialog/confirm-dialog.component';
import { ResetDialogComponent } from './shell/reset/reset-dialog.component';
import {
  LegalModalComponent,
  type LegalModalKind,
} from './ui/legal-modal/legal-modal.component';
import { FileMenuComponent } from './shell/file-menu.component';
import { LanguageMenuComponent } from './shell/language-menu.component';
import { StartMenuComponent } from './shell/start-menu.component';
import { UnsavedGuardService } from './shell/unsaved-guard.service';
import { SnackbarComponent } from './ui/snackbar/snackbar.component';

@Component({
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    SnackbarComponent,
    LegalModalComponent,
    BlockEditModalComponent,
    ConfirmDialogComponent,
    ResetDialogComponent,
    FileMenuComponent,
    LanguageMenuComponent,
    StartMenuComponent,
    BlockEditorHeaderComponent,
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

  private readonly unsaved = inject(UnsavedGuardService);
  private readonly blockEditor = inject(BlockEditorService);
  private readonly blockFlow = inject(BlockEditorFlow);

  private readonly url = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: '/' },
  );

  /** Start page: the title is plain text; everywhere else it links home. */
  protected readonly onStart = computed(() => this.url() === '/');
  /** Editor-only header controls (document name, undo/redo, save, export, menu). */
  protected readonly inEditor = computed(() => this.url().startsWith('/edit/'));
  /** Block editor: its own header part (way back, name, state, save buttons). */
  protected readonly onBlocks = computed(() => this.url().startsWith('/blocks/'));
  /** About shows a way back to the open document. */
  protected readonly onAbout = computed(() => this.url() === '/about');

  protected openLegal(kind: Exclude<LegalModalKind, null>): void {
    this.legalKind.set(kind);
  }

  protected closeLegal(): void {
    this.legalKind.set(null);
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && this.onBlocks()) {
      this.onBlockEditorKeydown(event);
      return;
    }
    if (!mod || !this.inEditor()) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      if (event.shiftKey) void this.unsaved.saveAs();
      else if (this.unsaved.canSave()) void this.unsaved.save();
      return;
    }
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

  /** Block editor: ⌘S saves the draft; undo and redo act on the block, never the template. */
  private onBlockEditorKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const work = this.blockEditor.work;
    if (key === 's') {
      event.preventDefault();
      void this.blockFlow.saveDraft();
      return;
    }
    if (key === 'z' && !event.shiftKey) {
      if (!work.canUndo()) return;
      event.preventDefault();
      work.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      if (!work.canRedo()) return;
      event.preventDefault();
      work.redo();
    }
  }
}
