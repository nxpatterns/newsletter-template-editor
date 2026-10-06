import { emptyNewsletter } from '../brand/defaults';
import { CURRENT_SCHEMA_VERSION, type Newsletter } from '../types';

const STORAGE_KEY = 'nte:newsletter:v1';

export interface StoredEnvelope {
  schemaVersion: number;
  newsletter: Newsletter;
  savedAt: string;
}

function isNewsletter(value: unknown): value is Newsletter {
  if (!value || typeof value !== 'object') return false;
  const n = value as Newsletter;
  return (
    typeof n.schemaVersion === 'number' &&
    n.globals !== undefined &&
    Array.isArray(n.blocks)
  );
}

/** Back-compat: older drafts stored companyLine as "Name · site". */
function normalizeNewsletter(n: Newsletter): Newsletter {
  const legal = n.globals?.legal as Newsletter['globals']['legal'] & {
    companyLine?: string;
  };
  if (!legal) return n;
  if (!legal.companyName && typeof legal.companyLine === 'string') {
    const raw = legal.companyLine.trim();
    const parts = raw.split('·').map((p) => p.trim()).filter(Boolean);
    legal.companyName = parts[0] || raw;
    if (!legal.companyWebsiteLabel && parts[1]) legal.companyWebsiteLabel = parts[1];
    if (!legal.companyWebsiteHref && parts[1]) {
      legal.companyWebsiteHref = parts[1].includes('://') ? parts[1] : `https://${parts[1]}`;
    }
  }
  legal.companyName = legal.companyName ?? '';
  legal.companyWebsiteLabel = legal.companyWebsiteLabel ?? '';
  legal.companyWebsiteHref = legal.companyWebsiteHref ?? '';
  return n;
}

export function loadNewsletter(): Newsletter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope | Newsletter;
    if (isNewsletter(parsed)) {
      return normalizeNewsletter(parsed);
    }
    if (parsed && typeof parsed === 'object' && isNewsletter((parsed as StoredEnvelope).newsletter)) {
      return normalizeNewsletter((parsed as StoredEnvelope).newsletter);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveNewsletter(newsletter: Newsletter): void {
  const envelope: StoredEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    newsletter: {
      ...newsletter,
      schemaVersion: newsletter.schemaVersion || CURRENT_SCHEMA_VERSION,
    },
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearNewsletter(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadOrSeed(seed: () => Newsletter): Newsletter {
  return loadNewsletter() ?? seed();
}

export function resetToSeed(seed: () => Newsletter): Newsletter {
  const n = seed();
  saveNewsletter(n);
  return n;
}

export { emptyNewsletter, STORAGE_KEY };
