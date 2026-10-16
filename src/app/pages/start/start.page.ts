import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import type { SeedLanguage } from '../../../core';
import { NewsletterSession, type RecentOverview } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { UnsavedGuardService } from '../../shell/unsaved-guard.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';

/** First screen: start blank or from a demo, continue the draft, or reopen a saved template. */
@Component({
  selector: 'app-start-page',
  imports: [NgTemplateOutlet],
  templateUrl: './start.page.html',
  styleUrl: './start.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartPage {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly unsaved = inject(UnsavedGuardService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  protected readonly overview = signal<RecentOverview | null>(null);
  protected readonly returning = computed(() => {
    const o = this.overview();
    return !!o && (!!o.draft || o.saved.length > 0);
  });
  /** Inline "really discard?" on the not-saved card. */
  protected readonly confirmDiscard = signal(false);
  private busy = false;

  constructor() {
    void this.session.recentOverview().then((o) => this.overview.set(o));
  }

  protected async startNew(kind: 'blank' | 'demo', lang?: SeedLanguage): Promise<void> {
    await this.run(async () => {
      await this.session.startNew(kind, lang ?? this.i18n.locale());
      return true;
    });
  }

  protected async continueDraft(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.session.hydrateFromStorage();
      await this.router.navigate(['/edit', this.session.routeId()]);
    } finally {
      this.busy = false;
    }
  }

  /** Saved newsletter: drop only the changes. Never saved: remove the draft. */
  protected async discardDraft(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.session.hydrateFromStorage();
      await this.session.discardChanges();
      this.confirmDiscard.set(false);
      this.overview.set(await this.session.recentOverview());
    } finally {
      this.busy = false;
    }
  }

  protected async openSaved(id: string): Promise<void> {
    await this.run(async () => {
      const ok = await this.session.openLibraryEntry(id).catch(() => false);
      if (!ok) this.snackbar.error(this.i18n.t('start.notFound'));
      return ok;
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

  /** Replace the open document only after the unsaved-changes question. */
  private async run(open: () => Promise<boolean>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      if (!(await this.unsaved.allowLeave())) return;
      if (await open()) await this.router.navigate(['/edit', this.session.routeId()]);
    } finally {
      this.busy = false;
    }
  }
}
