import type { RichNamePiece } from './model';

/**
 * Mailbox names that are no person ("info@x.eu"). Listmonk turns a missing name into the
 * part before the @, so such a name counts as unknown. Real names that match their address
 * ("Thomas Schmidt" for thomas.schmidt@…) stay.
 */
export const GREETING_ROLE_NAMES: readonly string[] = [
  'info', 'office', 'kontakt', 'contact', 'mail', 'email', 'post', 'service', 'support',
  'sales', 'vertrieb', 'verkauf', 'buchhaltung', 'rechnung', 'invoice', 'team', 'hallo',
  'hello', 'admin', 'empfang', 'rezeption', 'reception', 'reservierung', 'booking', 'buero',
  'büro', 'marketing', 'newsletter', 'zentrale', 'noreply', 'no reply',
];

/** True when a subscriber name is a real name (not empty, no address, no role mailbox). */
export function isRealName(name: string): boolean {
  const n = name.trim();
  return !!n && !n.includes('@') && !GREETING_ROLE_NAMES.includes(n.toLowerCase());
}

/** Listmonk template of the piece; uses Sprig functions shipped with Listmonk templates. `lead` and `fallback` are HTML already. */
export function nameTemplate(lead: string, fallback: string): string {
  const roles = GREETING_ROLE_NAMES.map((r) => `"${r}"`).join(' ');
  const withName = lead ? `${lead} {{ $n }}` : '{{ $n }}';
  return (
    '{{- $n := trim .Subscriber.Name -}}' +
    `{{- if and $n (not (contains "@" $n)) (not (has (lower $n) (list ${roles}))) -}}` +
    `${withName}{{- else -}}${fallback}{{- end -}}`
  );
}

/** What the piece reads for a sample name in the preview (plain text). */
export function namePieceText(piece: Pick<RichNamePiece, 'lead' | 'fallback'>, sample: string): string {
  if (!isRealName(sample)) return piece.fallback;
  const lead = piece.lead.trim();
  return lead ? `${lead} ${sample.trim()}` : sample.trim();
}
