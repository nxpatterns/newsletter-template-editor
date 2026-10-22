import type { ResetKind } from '../../../core/reset/reset-kinds';

/** How many rows of each kind; for the working draft and view settings any number above 0 means "included". */
export type KindCounts = Partial<Record<ResetKind, number>>;

/** Message for the start page after the app reloaded itself (reset or opened backup). */
export type AppNotice =
  | { kind: 'reset'; everything: boolean; deleted: KindCounts; backupFile: string | null }
  | { kind: 'resetFailed' }
  | { kind: 'restored'; file: string; restored: KindCounts };

/** Survives the reload, not the tab; never in localStorage, so the reset cannot delete it. */
const NOTICE_KEY = 'newsletter-template-editor.notice.v1';

export function writeAppNotice(notice: AppNotice, storage: Storage = sessionStorage): void {
  try {
    storage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    /* storage blocked: the start page just shows no message */
  }
}

/** Reads the message once and removes it, so a later reload shows nothing. */
export function takeAppNotice(storage: Storage = sessionStorage): AppNotice | null {
  try {
    const raw = storage.getItem(NOTICE_KEY);
    storage.removeItem(NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppNotice;
    return parsed && typeof parsed === 'object' && 'kind' in parsed ? parsed : null;
  } catch {
    return null;
  }
}
