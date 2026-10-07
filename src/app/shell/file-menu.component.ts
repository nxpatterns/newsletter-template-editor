import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { downloadFilename, renderExportOptimized } from '../../core';
import type { LibraryEntry } from '../../core/persist/idb-docs';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';
import { ExportHtmlDialogComponent, type HtmlExportKind } from './export-html-dialog.component';
import { LibraryPickerComponent } from './library-picker.component';

@Component({
  selector: 'app-file-menu',
  imports: [LibraryPickerComponent, ExportHtmlDialogComponent],
  templateUrl: './file-menu.component.html',
  styleUrl: './file-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class FileMenuComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly snackbar = inject(SnackbarService);

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly projectInput = viewChild<ElementRef<HTMLInputElement>>('projectInput');

  protected readonly open = signal(false);
  protected readonly libraryOpen = signal(false);
  protected readonly libraryRows = signal<LibraryEntry[]>([]);
  protected readonly exportOpen = signal(false);

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
    if (!this.open()) {
      this.libraryOpen.set(false);
      this.exportOpen.set(false);
    }
  }

  protected closeMenu(): void {
    this.open.set(false);
    this.libraryOpen.set(false);
    this.exportOpen.set(false);
  }

  protected onDocClick(event: Event): void {
    const el = this.root()?.nativeElement;
    if (!el || !this.open()) return;
    if (!el.contains(event.target as Node)) this.closeMenu();
  }

  protected async rename(): Promise<void> {
    this.closeMenu();
    const name = await this.confirm.prompt({
      title: this.i18n.t('file.renameTitle'),
      inputLabel: this.i18n.t('file.nameLabel'),
      initialValue: this.session.displayName(),
      confirmLabel: this.i18n.t('modal.save'),
      cancelLabel: this.i18n.t('modal.cancel'),
    });
    if (name) this.session.setDisplayName(name);
  }

  protected async save(): Promise<void> {
    this.closeMenu();
    const id = this.session.libraryId();
    if (id) {
      const ok = await this.confirm.confirm({
        title: this.i18n.t('file.saveTitle'),
        body: this.i18n.t('file.saveOverwriteBody').replace('{name}', this.session.displayName()),
        confirmLabel: this.i18n.t('file.overwrite'),
        cancelLabel: this.i18n.t('modal.cancel'),
      });
      if (!ok) return;
      // Secondary path: user might want save-as — use Save as menu for that.
      await this.session.saveToLibrary();
      return;
    }
    await this.saveAs();
  }

  protected async saveAs(): Promise<void> {
    this.closeMenu();
    const name = await this.confirm.prompt({
      title: this.i18n.t('file.saveAsTitle'),
      body: this.i18n.t('file.saveAsBody'),
      inputLabel: this.i18n.t('file.nameLabel'),
      initialValue: this.session.displayName(),
      confirmLabel: this.i18n.t('action.save'),
      cancelLabel: this.i18n.t('modal.cancel'),
    });
    if (!name) return;
    await this.session.saveToLibrary({ asNew: true, name });
  }

  protected async openLibrary(): Promise<void> {
    this.closeMenu();
    const rows = await this.session.listLibraryEntries();
    this.libraryRows.set(rows);
    this.libraryOpen.set(true);
  }

  protected closeLibraryPicker(): void {
    this.libraryOpen.set(false);
  }

  protected async pickLibrary(id: string): Promise<void> {
    if (!(await this.guardDirty())) return;
    const ok = await this.session.openLibraryEntry(id);
    this.libraryOpen.set(false);
    if (!ok) this.snackbar.error(this.i18n.t('file.openFailed'));
  }

  protected async removeLibrary(id: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('file.deleteTitle'),
      body: this.i18n.t('file.deleteBody'),
      confirmLabel: this.i18n.t('file.delete'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
    if (!ok) return;
    await this.session.deleteLibrary(id);
    this.libraryRows.set(await this.session.listLibraryEntries());
  }

  protected showExport(): void {
    this.closeMenu();
    this.exportOpen.set(true);
  }

  protected closeExportDialog(): void {
    this.exportOpen.set(false);
  }

  protected async exportHtml(kind: HtmlExportKind): Promise<void> {
    this.exportOpen.set(false);
    try {
      const arts = await renderExportOptimized(this.session.newsletter());
      const name = this.session.displayName();
      const prefix = this.session.globals().exportFileNamePrefix || name;
      if (kind === 'full') {
        this.triggerDownload(new Blob([arts.full], { type: 'text/html' }), downloadFilename(name, 'html'));
      } else {
        this.triggerDownload(
          new Blob([arts.standardTemplate], { type: 'text/html' }),
          downloadFilename(`${prefix}-template`, 'html'),
        );
        window.setTimeout(() => {
          this.triggerDownload(
            new Blob([arts.body], { type: 'text/html' }),
            downloadFilename(`${prefix}-body`, 'html'),
          );
        }, 120);
      }
      this.snackbar.success(this.i18n.t('file.exportDone'));
    } catch {
      this.snackbar.error(this.i18n.t('file.exportFailed'));
    }
  }

  protected downloadProject(): void {
    this.closeMenu();
    const blob = this.session.exportProjectJson();
    this.triggerDownload(blob, downloadFilename(this.session.displayName(), 'json'));
    this.snackbar.success(this.i18n.t('file.projectDownloaded'));
  }

  protected openProjectPicker(): void {
    this.projectInput()?.nativeElement.click();
  }

  protected async onProjectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.closeMenu();
    if (!file) return;
    if (!(await this.guardDirty())) return;
    try {
      const text = await file.text();
      if (!this.session.loadProjectJsonText(text)) {
        this.snackbar.error(this.i18n.t('file.openFailed'));
        return;
      }
      this.snackbar.success(this.i18n.t('file.projectOpened'));
    } catch {
      this.snackbar.error(this.i18n.t('file.openFailed'));
    }
  }

  protected async resetDemo(): Promise<void> {
    this.closeMenu();
    if (!(await this.guardDirty())) return;
    const ok = await this.confirm.confirm({
      title: this.i18n.t('file.resetTitle'),
      body: this.i18n.t('file.resetBody'),
      confirmLabel: this.i18n.t('action.reset'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
    if (ok) await this.session.resetSeed();
  }

  private async guardDirty(): Promise<boolean> {
    if (!this.session.dirty()) return true;
    return this.confirm.confirm({
      title: this.i18n.t('file.dirtyTitle'),
      body: this.i18n.t('file.dirtyBody'),
      confirmLabel: this.i18n.t('file.discard'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
