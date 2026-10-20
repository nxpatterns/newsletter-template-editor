import { inject, Injectable, InjectionToken } from '@angular/core';
import { STORAGE_KEY as LEGACY_DRAFT_KEY } from '../../core/persist/storage';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { LOCALE_STORAGE_KEY } from '../i18n/types';
import { ConfirmDialogService } from '../ui/confirm-dialog/confirm-dialog.service';

/** Prefix of every UI state key the app keeps in localStorage (open groups, panel width, …). */
export const APP_STORAGE_PREFIX = 'newsletter-template-editor.';

/** Fresh start after a reset: reload on the start page so no service keeps old UI state in memory. */
export const APP_RELOAD = new InjectionToken<() => void>('APP_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.replace(document.baseURI),
});

/** Remove the app's browser state; the app language stays. */
export function clearAppStorage(storage: Storage = localStorage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || key === LOCALE_STORAGE_KEY) continue;
    if (key.startsWith(APP_STORAGE_PREFIX) || key === LEGACY_DRAFT_KEY) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

/** "Reset everything to defaults": saved templates, draft and UI state, after a deliberate confirmation. */
@Injectable({ providedIn: 'root' })
export class FactoryResetService {
  private readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly reload = inject(APP_RELOAD);

  /** Asks first; true when everything was reset. */
  async run(): Promise<boolean> {
    const count = (await this.session.listLibraryEntries().catch(() => [])).length;
    const body = count === 0 ? 'reset.bodyNone' : count === 1 ? 'reset.bodyOne' : 'reset.bodyMany';
    const ok = await this.confirm.confirm({
      title: this.i18n.t('reset.title'),
      body: this.i18n.t(body, { count }),
      note: this.i18n.t('reset.exportFirst'),
      acknowledge: this.i18n.t('reset.acknowledge'),
      warning: true,
      confirmLabel: this.i18n.t('reset.confirm'),
      cancelLabel: this.i18n.t('modal.cancel'),
      danger: true,
    });
    if (!ok) return false;
    await this.session.resetAll();
    try {
      clearAppStorage();
    } catch {
      /* storage blocked */
    }
    this.reload();
    return true;
  }
}
