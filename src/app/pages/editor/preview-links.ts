/** Reserved example domains (RFC 2606): placeholder targets, never worth opening. */
const PLACEHOLDER_HOST = /(^|\.)example\.(com|org|net)$/i;

/**
 * Where a link clicked inside the selected preview block should go, or null when it
 * should do nothing: empty, `#…`, template tags (`{{ … }}`), unsupported schemes and
 * placeholder targets (example.com, including mailto addresses on it).
 */
export function previewLinkTarget(href: string | null | undefined): string | null {
  const raw = (href ?? '').trim();
  if (!raw || raw.startsWith('#') || raw.includes('{{')) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  switch (url.protocol) {
    case 'http:':
    case 'https:':
      return PLACEHOLDER_HOST.test(url.hostname) ? null : url.href;
    case 'mailto:': {
      const address = decodeURIComponent(url.pathname);
      const domain = address.split('@')[1] ?? '';
      return domain && !PLACEHOLDER_HOST.test(domain) ? raw : null;
    }
    case 'tel:':
      return /\d/.test(url.pathname) ? raw : null;
    default:
      return null;
  }
}

/** Web links open in a new tab; mailto/tel hand off to the system handler without leaving the editor. */
export function openPreviewLink(target: string, win: Window): void {
  if (/^https?:/i.test(target)) {
    win.open(target, '_blank', 'noopener,noreferrer');
  } else {
    win.location.href = target;
  }
}
