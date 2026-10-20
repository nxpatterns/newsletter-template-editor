import { computed, inject, Injectable } from '@angular/core';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { ConfirmDialogService, type DialogTextPart } from '../ui/confirm-dialog/confirm-dialog.service';

/** What happens after the question: open a template or file, start a new one, or go to the start page. */
export type LeaveTarget = 'open' | 'new' | 'home';

/** The template or file about to be opened, so the question can name it. */
export interface LeaveTargetInfo {
  id?: string;
  name?: string;
}

type LeaveKind = LeaveTarget | 'reopen';

const WANT = {
  open: 'file.dirtyWantOpen',
  reopen: 'file.dirtyWantReopen',
  new: 'file.dirtyWantNew',
  home: 'file.dirtyWantHome',
} as const;
const THEN = {
  open: 'file.dirtyThenOpen',
  reopen: 'file.dirtyThenReopen',
  new: 'file.dirtyThenNew',
  home: 'file.dirtyThenHome',
} as const;

/** Before the open newsletter is replaced or left: Save / Discard / Cancel when it has unsaved changes. */
@Injectable({ providedIn: 'root' })
export class UnsavedGuardService {
  private readonly session = inject(NewsletterSession);
  private readonly i18n = inject(LocaleService);
  private readonly confirm = inject(ConfirmDialogService);

  /** Something to save: unsaved changes, or a document that was never saved. */
  readonly canSave = computed(() => this.session.dirty() || !this.session.libraryId());

  /**
   * True when it is fine to continue (nothing unsaved, saved, or discarded).
   * `next` and `target` let the question name both templates and what each button leads to.
   * `onCancel` runs only for the Cancel answer (not for a cancelled name prompt).
   */
  async allowLeave(
    next: LeaveTarget = 'home',
    target: LeaveTargetInfo = {},
    onCancel?: () => void,
  ): Promise<boolean> {
    if (!this.session.dirty()) return true;
    const kind: LeaveKind =
      next === 'open' && !!target.id && target.id === this.session.libraryId() ? 'reopen' : next;
    const name = this.session.displayName();
    const fill = (text: string) => text.replaceAll('{name}', name).replaceAll('{target}', target.name ?? '');
    const then = fill(this.i18n.t(THEN[kind]));
    const ask = this.i18n.t('file.dirtyAsk').replace('{want}', this.i18n.t(WANT[kind]));
    const bodyParts = ask
      .split(/(\{name\}|\{target\})/)
      .filter((text) => text)
      .map((text): DialogTextPart => {
        if (text === '{name}') return { text: name, chip: 'dirty' };
        if (text === '{target}') return { text: target.name ?? '', chip: 'name' };
        return { text };
      });
    const choice = await this.confirm.choose({
      title: this.i18n.t('file.dirtyTitle'),
      body: fill(ask),
      bodyParts,
      tone: 'warning',
      altLabel: this.i18n.t('file.discard'),
      altHint: fill(this.i18n.t('file.dirtyHintDiscard')).replace('{then}', then),
      confirmLabel: this.i18n.t('action.save'),
      confirmHint: fill(this.i18n.t('file.dirtyHintSave')).replace('{then}', then),
      cancelLabel: this.i18n.t('modal.cancel'),
      cancelHint: this.i18n.t('file.dirtyHintCancel'),
    });
    if (choice === 'cancel') {
      onCancel?.();
      return false;
    }
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
