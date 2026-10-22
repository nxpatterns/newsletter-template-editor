import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import type { SeedLanguage } from '../../../core';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { FlagComponent, type FlagCode } from '../../ui/flag/flag.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { takeAppNotice } from '../../shell/reset/app-notice';
import { describeKinds } from '../../shell/reset/kind-text';
import { OpenFromFileService } from './open-from-file.service';
import { StartActionsService } from './start-actions.service';

/** How long "Undo" stays available after deleting a saved template or a demo. */
const UNDO_MS = 8000;

/** First screen: start blank or from a demo, continue the draft, or reopen a saved template. */
@Component({
  selector: 'app-start-page',
  imports: [NgTemplateOutlet, FlagComponent],
  templateUrl: './start.page.html',
  styleUrl: './start.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartPage {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly actions = inject(StartActionsService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);
  private readonly openFromFile = inject(OpenFromFileService);

  /** Regions each demo language is written for. */
  protected readonly demoDeFlags: FlagCode[] = ['de', 'at', 'ch'];
  protected readonly demoEnFlags: FlagCode[] = ['uk', 'us', 'ca', 'au', 'nz', 'ie'];

  protected readonly overview = this.actions.overview;
  protected readonly returning = computed(() => {
    const o = this.overview();
    return !!o && (!!o.draft || o.saved.length > 0);
  });
  /** Pinned saved templates as tiles after the demos, in the order they were pinned. */
  protected readonly pinned = computed(() =>
    (this.overview()?.saved ?? [])
      .filter((row) => row.pinnedAt)
      .sort((a, b) => (a.pinnedAt ?? '').localeCompare(b.pinnedAt ?? '')),
  );
  /** Message after the app reloaded itself: what the reset deleted or what an opened backup added. */
  private readonly notice = signal(takeAppNotice());
  protected readonly noticeView = computed(() => {
    const n = this.notice();
    if (!n) return null;
    const t = (key: string, params?: Record<string, string>) => this.i18n.t(key, params);
    if (n.kind === 'resetFailed') return { error: true, title: t('reset.done.failed'), text: '', hint: '', backup: null };
    if (n.kind === 'reset') {
      const list = describeKinds(this.i18n, n.deleted);
      return {
        error: false,
        title: t(n.everything ? 'reset.done.all' : 'reset.done.partial'),
        text: list ? t('reset.done.deleted', { list }) : '',
        hint: n.backupFile ? t('reset.done.backupHint', { file: n.backupFile }) : t('reset.done.noUndo'),
        backup: n.backupFile,
      };
    }
    const list = describeKinds(this.i18n, n.restored);
    return {
      error: false,
      title: t('restore.done'),
      text: list ? t('restore.added', { list }) : t('restore.nothingNew'),
      hint: t('restore.keptHint', { file: n.file }),
      backup: null,
    };
  });
  /** Inline "really discard?" on the not-saved card. */
  protected readonly confirmDiscard = signal(false);
  /** Not-saved card shakes after Cancel in the unsaved-changes question: "this is the one". */
  protected readonly nudging = signal(false);

  constructor() {
    this.overview.set(null);
    void this.actions.refresh();
    // Only Cancels from now on, not ones from an earlier visit (the counter lives in a root service).
    let seen = this.actions.draftNudge();
    effect(() => {
      const count = this.actions.draftNudge();
      if (count === seen) return;
      seen = count;
      // Off for one frame so a second Cancel restarts the animation.
      this.nudging.set(false);
      requestAnimationFrame(() => this.nudging.set(true));
    });
  }

  protected onNudgeEnd(event: AnimationEvent): void {
    if (event.target === event.currentTarget) this.nudging.set(false);
  }

  protected closeNotice(): void {
    this.notice.set(null);
  }

  /** "Open backup…" in the message after a reset with a saved file. */
  protected openBackup(): Promise<void> {
    return this.openFromFile.pick();
  }

  protected startNew(kind: 'blank' | 'demo', lang?: SeedLanguage): Promise<void> {
    return this.actions.startNew(kind, lang);
  }

  protected newBlock(): Promise<void> {
    return this.actions.newBlock();
  }

  protected openSaved(id: string): Promise<void> {
    return this.actions.openSaved(id);
  }

  protected continueDraft(): Promise<void> {
    return this.actions.exclusive(async () => {
      await this.session.hydrateFromStorage();
      await this.router.navigate(['/edit', this.session.routeId()]);
    });
  }

  /** Saved newsletter: drop only the changes. Never saved: remove the draft. */
  protected discardDraft(): Promise<void> {
    return this.actions.exclusive(async () => {
      await this.session.hydrateFromStorage();
      await this.session.discardChanges();
      this.confirmDiscard.set(false);
      await this.actions.refresh();
    });
  }

  /** Delete right away (like a block's ×), with "Undo" in the message. */
  protected deleteSaved(id: string, name: string): Promise<void> {
    return this.actions.exclusive(async () => {
      const undo = await this.session.deleteLibraryWithUndo(id);
      await this.actions.refresh();
      if (!undo) return;
      this.snackbar.show(this.i18n.t('start.deleted', { name }), 'info', UNDO_MS, {
        label: this.i18n.t('start.undo'),
        run: () => void undo().then(() => this.actions.refresh()),
      });
    });
  }

  protected togglePin(id: string, pinned: boolean): Promise<void> {
    return this.actions.exclusive(async () => {
      await this.session.setPinned(id, pinned);
      await this.actions.refresh();
    });
  }

  /** Demo tile ×: hidden right away with "Undo", like a saved template; the reset brings it back. */
  protected deleteDemo(lang: SeedLanguage): Promise<void> {
    return this.actions.exclusive(async () => {
      const undo = await this.session.hideDemoWithUndo(lang);
      await this.actions.refresh();
      const name = this.i18n.t(lang === 'de' ? 'start.demoDe' : 'start.demoEn');
      this.snackbar.show(this.i18n.t('start.deleted', { name }), 'info', UNDO_MS, {
        label: this.i18n.t('start.undo'),
        run: () => void undo().then(() => this.actions.refresh()),
      });
    });
  }

  /** "heute, 08:05" / "gestern, 16:40" / "12.10.2026, 09:12" (and the English equivalents). */
  protected formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const locale = this.i18n.locale() === 'de' ? 'de-DE' : 'en-GB';
    const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(d);
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);
    if (days === 0 || days === -1) {
      const word = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
      return `${word}, ${time}`;
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }
}
