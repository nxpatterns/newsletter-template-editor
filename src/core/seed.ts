import { CLOUDLIB_CAMPAIGN_V1 } from './seed-data/cloudlib-campaign.v1';
import { normalizeNewsletter } from './persist/normalize-newsletter';
import { CURRENT_SCHEMA_VERSION, type Newsletter } from './types';

/** Deep-clone the full CloudLib campaign seed (demo config only). */
export function seedNewsletter(): Newsletter {
  const raw = structuredClone(CLOUDLIB_CAMPAIGN_V1) as Newsletter;
  return normalizeNewsletter({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals: raw.globals,
    blocks: raw.blocks,
  });
}
