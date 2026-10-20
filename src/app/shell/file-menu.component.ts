import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import {
  buildZip,
  downloadFilename,
  filledSocialNetworks,
  hostedSocialIcons,
  renderExportOptimized,
  socialIconFileName,
} from '../../core';
import { SocialIconsService } from '../editor/social-icons.service';
import type { TemplateSummary } from '../../core/persist/template-repository';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';
import { FactoryResetService } from './factory-reset.service';
import { ExportHtmlDialogComponent, type HtmlExportKind } from './export-html-dialog.component';
import { activeColors } from '../../core/colors';
import { LibraryPickerComponent } from './library-picker.component';
import { MenuIconComponent } from './menu-icon.component';
import { UnsavedGuardService } from './unsaved-guard.service';

@Component({
  selector: 'app-file-menu',
  imports: [LibraryPickerComponent, ExportHtmlDialogComponent, MenuIconComponent],
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
  private readonly unsaved = inject(UnsavedGuardService);
  private readonly socialIcons = inject(SocialIconsService);
  private readonly reset = inject(FactoryResetService);

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly projectInput = viewChild<ElementRef<HTMLInputElement>>('projectInput');

  protected readonly open = signal(false);
  protected readonly libraryOpen = signal(false);
  protected readonly libraryRows = signal<TemplateSummary[]>([]);
  protected readonly exportOpen = signal(false);

  protected readonly canSave = this.unsaved.canSave;

  /** Shortcut hint on the Save button. */
  protected readonly saveShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘S' : 'Ctrl+S';

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

  /** Header Save: no overwrite question; the first save asks for a name. */
  protected async save(): Promise<void> {
    this.closeMenu();
    await this.unsaved.save();
  }

  protected async saveAs(): Promise<void> {
    this.closeMenu();
    await this.unsaved.saveAs();
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
    if (!(await this.unsaved.allowLeave())) return;
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

  protected async factoryReset(): Promise<void> {
    this.closeMenu();
    await this.reset.run();
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
      const n = this.session.newsletter();
      const color = activeColors(n.globals.colors).head;
      // Icons only with a public image address; otherwise the footer falls back to text links.
      const socialIcons = hostedSocialIcons(n.globals.legal.social, n.globals.assetBaseUrl, color) ?? undefined;
      const arts = await renderExportOptimized(n, { socialIcons });
      const name = this.session.displayName();
      const prefix = this.session.globals().exportFileNamePrefix || name;
      const files: { name: string; html: string }[] =
        kind === 'full'
          ? [{ name: downloadFilename(name, 'html'), html: arts.full }]
          : [
              { name: downloadFilename(`${prefix}-template`, 'html'), html: arts.standardTemplate },
              { name: downloadFilename(`${prefix}-body`, 'html'), html: arts.body },
            ];
      if (socialIcons) {
        const icons = await Promise.all(
          filledSocialNetworks(n.globals.legal.social).map(async (net) => ({
            path: `social/${socialIconFileName(net.id, color)}`,
            data: await this.socialIcons.burnPng(net.id, color),
          })),
        );
        const zip = buildZip([...files.map((f) => ({ path: f.name, data: f.html })), ...icons]);
        this.triggerDownload(new Blob([zip as BlobPart], { type: 'application/zip' }), downloadFilename(name, 'zip'));
        this.snackbar.success(this.i18n.t('file.exportZipDone'));
        return;
      }
      files.forEach((f, i) => {
        const go = () => this.triggerDownload(new Blob([f.html], { type: 'text/html' }), f.name);
        if (i === 0) go();
        else window.setTimeout(go, 120 * i);
      });
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
    if (!(await this.unsaved.allowLeave())) return;
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
