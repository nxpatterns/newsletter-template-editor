import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import type { SeedLanguage } from '../../core';
import type { TemplateSummary } from '../../core/persist/template-repository';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { OpenFromFileService } from '../pages/start/open-from-file.service';
import { StartActionsService } from '../pages/start/start-actions.service';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';
import { FactoryResetService } from './reset/factory-reset.service';
import { FlagComponent } from '../ui/flag/flag.component';
import { LibraryPickerComponent } from './library-picker.component';
import { MenuIconComponent } from './menu-icon.component';

/** Header "⋮" menu on the start page: the start choices, saved templates, open from file and the reset. */
@Component({
  selector: 'app-start-menu',
  imports: [LibraryPickerComponent, MenuIconComponent, FlagComponent],
  templateUrl: './start-menu.component.html',
  styleUrl: './start-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class StartMenuComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly actions = inject(StartActionsService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly reset = inject(FactoryResetService);
  private readonly openFromFile = inject(OpenFromFileService);

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  protected readonly open = signal(false);
  protected readonly libraryOpen = signal(false);
  protected readonly libraryRows = signal<TemplateSummary[]>([]);
  /** Greyed out "Open…" while there is nothing saved. */
  protected readonly hasSaved = computed(() => (this.actions.overview()?.saved.length ?? 0) > 0);
  /** Demos still on the start page; a deleted demo leaves this menu too. */
  protected readonly showDemoDe = computed(() => !this.actions.overview()?.hiddenDemos.includes('de'));
  protected readonly showDemoEn = computed(() => !this.actions.overview()?.hiddenDemos.includes('en'));

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected closeMenu(): void {
    this.open.set(false);
  }

  protected onDocClick(event: Event): void {
    const el = this.root()?.nativeElement;
    if (!el || !this.open()) return;
    if (!el.contains(event.target as Node)) this.closeMenu();
  }

  protected async startNew(kind: 'blank' | 'demo', lang?: SeedLanguage): Promise<void> {
    this.closeMenu();
    await this.actions.startNew(kind, lang);
  }

  protected async newBlock(): Promise<void> {
    this.closeMenu();
    await this.actions.newBlock();
  }

  protected async openLibrary(): Promise<void> {
    this.closeMenu();
    this.libraryRows.set(await this.session.listLibraryEntries());
    this.libraryOpen.set(true);
  }

  protected async pickLibrary(id: string): Promise<void> {
    this.libraryOpen.set(false);
    await this.actions.openSaved(id);
  }

  /** Same question as in the editor menu; the start page list follows. */
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
    await this.actions.refresh();
  }

  /** A backup from the reset dialog or a template file. */
  protected async openFile(): Promise<void> {
    this.closeMenu();
    await this.openFromFile.pick();
  }

  protected async factoryReset(): Promise<void> {
    this.closeMenu();
    await this.reset.run();
  }
}
