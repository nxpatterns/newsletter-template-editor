import { inject, Injectable, InjectionToken } from '@angular/core';
import { STORAGE_KEY as LEGACY_DRAFT_KEY } from '../../../core/persist/storage';
import { buildBackup } from '../../../core/reset/backup-file';
import type { ResetInventory, ResetKind } from '../../../core/reset/reset-kinds';
import { APP_DATA_STORE } from '../../editor/app-data-store.token';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { LOCALE_STORAGE_KEY } from '../../i18n/types';
import { writeAppNotice, type KindCounts } from './app-notice';
import { saveBlob } from './browser-files';
import { backupFileName } from './kind-text';
import { ResetDialogService } from './reset-dialog.service';

/** Prefix of every UI state key the app keeps in localStorage (open groups, panel width, …). */
export const APP_STORAGE_PREFIX = 'newsletter-template-editor.';

/** Fresh start after a reset: reload on the start page so no service keeps old UI state in memory. */
export const APP_RELOAD = new InjectionToken<() => void>('APP_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.replace(document.baseURI),
});

/** Downloads a file; swapped in tests. */
export const SAVE_FILE = new InjectionToken<(blob: Blob, filename: string) => void>('SAVE_FILE', {
  providedIn: 'root',
  factory: () => saveBlob,
});

const isViewSetting = (key: string) =>
  key !== LOCALE_STORAGE_KEY && (key.startsWith(APP_STORAGE_PREFIX) || key === LEGACY_DRAFT_KEY);

/** The app's remembered view settings; the app language is not one of them. */
export function readAppStorage(storage: Storage = localStorage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !isViewSetting(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

/** Remove the app's browser state; the app language stays. */
export function clearAppStorage(storage: Storage = localStorage): void {
  Object.keys(readAppStorage(storage)).forEach((key) => storage.removeItem(key));
}

/** Puts saved view settings back; returns how many were written. Keys of other apps and the language are skipped. */
export function writeAppStorage(settings: Record<string, string>, storage: Storage = localStorage): number {
  const entries = Object.entries(settings).filter(([key]) => isViewSetting(key));
  entries.forEach(([key, value]) => storage.setItem(key, value));
  return entries.length;
}

function countAppStorage(): number {
  try {
    return Object.keys(readAppStorage()).length;
  } catch {
    return 0;
  }
}

const EMPTY_INVENTORY: Omit<ResetInventory, 'viewSettings'> = {
  templates: 0,
  hiddenDemos: 0,
  ownBlocks: 0,
  blockDrafts: 0,
  oldestDraftAt: null,
  workingDraft: null,
};

/** What a reset of these kinds deletes, for the message after the reload. */
function deletedCounts(inv: ResetInventory, kinds: readonly ResetKind[]): KindCounts {
  const all: KindCounts = {
    templates: inv.templates,
    ownBlocks: inv.ownBlocks,
    blockDrafts: inv.blockDrafts,
    workingDraft: inv.workingDraft ? 1 : 0,
    viewSettings: inv.viewSettings,
  };
  return Object.fromEntries(kinds.map((k) => [k, all[k] ?? 0]));
}

/**
 * "Reset everything to defaults": the dialog lists each kind of stored data with its count, all
 * checked; the user unchecks what stays, may save the checked kinds as a file first, and confirms.
 */
@Injectable({ providedIn: 'root' })
export class FactoryResetService {
  private readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly store = inject(APP_DATA_STORE);
  private readonly dialog = inject(ResetDialogService);
  private readonly reload = inject(APP_RELOAD);
  private readonly saveFile = inject(SAVE_FILE);

  /** Asks first; true when the checked kinds were deleted. */
  async run(): Promise<boolean> {
    await this.session.flushRecovery().catch(() => undefined);
    const stored = await this.store.inventory().catch(() => EMPTY_INVENTORY);
    const inventory: ResetInventory = { ...stored, viewSettings: countAppStorage() };
    const result = await this.dialog.open({ inventory, save: (kinds) => this.saveBackup(kinds) });
    if (!result || result.kinds.length === 0) return false;
    await this.session.releaseForReload(!result.kinds.includes('workingDraft'));
    try {
      await this.store.clear(result.kinds);
    } catch {
      // One transaction: nothing was deleted. The reload shows the stored state again.
      writeAppNotice({ kind: 'resetFailed' });
      this.reload();
      return false;
    }
    if (result.kinds.includes('viewSettings')) {
      try {
        clearAppStorage();
      } catch {
        /* storage blocked */
      }
    }
    writeAppNotice({
      kind: 'reset',
      everything: result.everything,
      deleted: deletedCounts(inventory, result.kinds),
      backupFile: result.backupFile,
    });
    this.reload();
    return true;
  }

  /** "Save selected as a file": only the checked kinds (decision 67). */
  private async saveBackup(kinds: ResetKind[]): Promise<string | null> {
    try {
      const data = await this.store.read(kinds);
      if (kinds.includes('viewSettings')) data.viewSettings = readAppStorage();
      const now = new Date();
      const file = buildBackup(data, kinds, now.toISOString());
      const name = backupFileName(this.i18n, now);
      this.saveFile(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), name);
      return name;
    } catch {
      return null;
    }
  }
}
