import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { SeedLanguage } from '../../../core';
import { NewsletterSession, type RecentOverview } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { type LeaveTarget, type LeaveTargetInfo, UnsavedGuardService } from '../../shell/unsaved-guard.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';

/** What the start page offers, shared by its tiles and the header menu on the start page. */
@Injectable({ providedIn: 'root' })
export class StartActionsService {
  private readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly unsaved = inject(UnsavedGuardService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  /** Draft in progress and saved templates; null until loaded. */
  readonly overview = signal<RecentOverview | null>(null);
  /** Counts Cancel answers to the unsaved-changes question; the start page then shakes the not-saved card. */
  readonly draftNudge = signal(0);
  private busy = false;

  async refresh(): Promise<void> {
    this.overview.set(await this.session.recentOverview());
  }

  async startNew(kind: 'blank' | 'demo', lang?: SeedLanguage): Promise<void> {
    await this.run('new', async () => {
      await this.session.startNew(kind, lang ?? this.i18n.locale());
      return true;
    });
  }

  async openSaved(id: string): Promise<void> {
    await this.run('open', async () => {
      const ok = await this.session.openLibraryEntry(id).catch(() => false);
      if (!ok) this.snackbar.error(this.i18n.t('start.notFound'));
      return ok;
    }, { id, name: this.overview()?.saved.find((s) => s.id === id)?.displayName });
  }

  /** One start page action at a time (double clicks, tile and menu together). */
  async exclusive(work: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await work();
    } finally {
      this.busy = false;
    }
  }

  /** Replace the open document only after the unsaved-changes question. */
  private async run(next: LeaveTarget, open: () => Promise<boolean>, target?: LeaveTargetInfo): Promise<void> {
    await this.exclusive(async () => {
      const nudge = () => this.draftNudge.update((n) => n + 1);
      if (!(await this.unsaved.allowLeave(next, target, nudge))) return;
      if (await open()) await this.router.navigate(['/edit', this.session.routeId()]);
    });
  }
}
