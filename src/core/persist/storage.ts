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

export function loadNewsletter(): Newsletter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope | Newsletter;
    if (isNewsletter(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object' && isNewsletter((parsed as StoredEnvelope).newsletter)) {
      return (parsed as StoredEnvelope).newsletter;
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
