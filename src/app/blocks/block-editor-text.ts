import type { LocaleService } from '../i18n/locale.service';

/** "2,1" in German, "2.1" in English: one decimal, as the Colors tab shows ratios. */
export function formatRatio(ratio: number, locale: string): string {
  return ratio.toFixed(1).replace('.', locale === 'de' ? ',' : '.');
}

/** Name of a block color: the type's own word if it has one, else the shared word for the key. */
export function slotLabel(i18n: LocaleService, type: string, key: string): string {
  const specific = `colors.slot.${type}.${key}`;
  const label = i18n.t(specific);
  return label === specific ? i18n.t(`colors.slot.${key}`) : label;
}
