import { RESET_KINDS } from '../../../core/reset/reset-kinds';
import type { LocaleService } from '../../i18n/locale.service';
import type { KindCounts } from './app-notice';

/** "12 templates, 3 own blocks and the current working draft"; empty when nothing counts. */
export function describeKinds(i18n: LocaleService, counts: KindCounts): string {
  const parts = RESET_KINDS.flatMap((kind) => {
    const n = counts[kind] ?? 0;
    if (n <= 0) return [];
    if (kind === 'workingDraft' || kind === 'viewSettings') return [i18n.t(`reset.part.${kind}`)];
    return [i18n.t(`reset.part.${kind}${n === 1 ? 'One' : 'Many'}`, { count: n })];
  });
  return new Intl.ListFormat(i18n.locale(), { type: 'conjunction' }).format(parts);
}

/** File name of a backup: "newsletter-backup-2026-10-22.json", in the app language. */
export function backupFileName(i18n: LocaleService, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return i18n.t('reset.backupFileName', { date });
}
