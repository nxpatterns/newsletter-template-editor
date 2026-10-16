import { computed, inject, Injectable } from '@angular/core';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';

/** Before the open newsletter is replaced or left: Save / Discard / Cancel when it has unsaved changes. */
@Injectable({ providedIn: 'root' })
export class UnsavedGuardService {
  private readonly session = inject(NewsletterSession);
  private readonly i18n = inject(LocaleService);
  private readonly confirm = inject(ConfirmDialogService);

  /** Something to save: unsaved changes, or a document that was never saved. */
  readonly canSave = computed(() => this.session.dirty() || !this.session.libraryId());

  /** True when it is fine to continue (nothing unsaved, saved, or discarded). */
  async allowLeave(): Promise<boolean> {
    if (!this.session.dirty()) return true;
    const choice = await this.confirm.choose({
      title: this.i18n.t('file.dirtyTitle'),
      body: this.i18n.t('file.dirtyBody').replace('{name}', this.session.displayName()),
      confirmLabel: this.i18n.t('action.save'),
      altLabel: this.i18n.t('file.discard'),
      cancelLabel: this.i18n.t('modal.cancel'),
    });
    if (choice === 'cancel') return false;
    if (choice === 'alt') {
      await this.session.discardChanges();
      return true;
    }
    return this.save();
  }

  /** Save into the bound library entry without asking, or ask for a name the first time. */
  async save(): Promise<boolean> {
    if (this.session.libraryId()) return this.session.saveToLibrary();
    return this.saveAs();
  }

  /** Save as a new library entry under a name the user picks. */
  async saveAs(): Promise<boolean> {
    const name = await this.confirm.prompt({
      title: this.i18n.t('file.saveAsTitle'),
      body: this.i18n.t('file.saveAsBody'),
      inputLabel: this.i18n.t('file.nameLabel'),
      initialValue: this.session.displayName(),
      confirmLabel: this.i18n.t('action.save'),
      cancelLabel: this.i18n.t('modal.cancel'),
    });
    if (!name) return false;
    return this.session.saveToLibrary({ asNew: true, name });
  }
}
