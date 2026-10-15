/**
 * Link addresses as sellers type them: web page, email or phone.
 * Turns "cloudlib.eu", "info@cloudlib.eu" or "+49 30 123456" into a safe href and back.
 */

export type LinkKind = 'web' | 'email' | 'phone';

const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

/** What the typed address most likely is; null while it is still unclear. */
export function detectLinkKind(raw: string): LinkKind | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^mailto:/i.test(v)) return 'email';
  if (/^tel:/i.test(v)) return 'phone';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^www\./i.test(v)) return 'web';
  if (/^[^\s@/]+@/.test(v)) return 'email';
  if (/^\+?[\d\s()./-]+$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 5) return 'phone';
  if (/^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(v)) return 'web';
  return null;
}

/** Build the href for a kind, or null when the address is not usable yet. */
export function buildLinkHref(kind: LinkKind, raw: string, subject = ''): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (kind === 'email') {
    const addr = v.replace(/^mailto:/i, '').split('?')[0];
    if (!EMAIL_RE.test(addr)) return null;
    const s = subject.trim();
    return `mailto:${addr}${s ? `?subject=${encodeURIComponent(s)}` : ''}`;
  }
  if (kind === 'phone') {
    const rest = v.replace(/^tel:/i, '');
    const digits = rest.replace(/\D/g, '');
    if (digits.length < 5) return null;
    return `tel:${rest.trim().startsWith('+') ? '+' : ''}${digits}`;
  }
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return candidate;
  } catch {
    return null;
  }
}

/** Split an existing href back into what the link form shows. */
export function parseLinkHref(href: string): { kind: LinkKind; address: string; subject: string } {
  if (/^mailto:/i.test(href)) {
    const [addr, query = ''] = href.slice(7).split('?');
    const subject = new URLSearchParams(query).get('subject') ?? '';
    return { kind: 'email', address: decodeURIComponent(addr), subject };
  }
  if (/^tel:/i.test(href)) return { kind: 'phone', address: href.slice(4), subject: '' };
  return { kind: 'web', address: href, subject: '' };
}
