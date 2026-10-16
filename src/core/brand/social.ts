/**
 * Social networks of the footer row. One entry per icon in public/icons/social (<id>.svg);
 * a unit test keeps this list and the folder in sync. The order here is the order in the email.
 */
export const SOCIAL_NETWORKS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'threads', label: 'Threads' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'dailymotion', label: 'Dailymotion' },
  { id: 'snapchat', label: 'Snapchat' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]['id'];
export type SocialLinks = Record<SocialNetworkId, string>;

/** App-relative folder of the source SVGs. */
export const SOCIAL_ICON_DIR = 'icons/social';
/** Displayed icon size in the email (px); PNGs are burned at twice this. */
export const SOCIAL_ICON_PX = 24;

export function emptySocialLinks(): SocialLinks {
  return Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, ''])) as SocialLinks;
}

export function normalizeSocialLinks(raw: unknown): SocialLinks {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = emptySocialLinks();
  for (const n of SOCIAL_NETWORKS) {
    const v = src[n.id];
    if (typeof v === 'string') out[n.id] = v;
  }
  return out;
}

/** Networks with a link, in email order. */
export function filledSocialNetworks(links: SocialLinks | undefined): (typeof SOCIAL_NETWORKS)[number][] {
  if (!links) return [];
  return SOCIAL_NETWORKS.filter((n) => (links[n.id] ?? '').trim());
}

/** File name of a burned icon; includes the color so a palette change never reuses a stale upload. */
export function socialIconFileName(id: SocialNetworkId, color: string): string {
  return `${id}-${color.replace(/^#/, '').toLowerCase()}.png`;
}

/** The SVG with its root fill set to `color` (the icons are single-color, fill on the root element). */
export function recolorSvg(svg: string, color: string): string {
  return svg.replace(/<svg\b([^>]*)>/, (_, attrs: string) => {
    const rest = attrs.replace(/\sfill="[^"]*"/, '');
    return `<svg${rest} fill="${color}">`;
  });
}

/** Icon source per network: hosted PNG URLs in an export, colored SVG data URLs in the preview. */
export type SocialIconSources = Partial<Record<SocialNetworkId, string>>;

/** A usable image base address: http(s), no spaces. */
export function isAssetBaseUrl(raw: string | undefined): boolean {
  return /^https?:\/\/[^\s]+$/i.test((raw ?? '').trim());
}

/** Hosted icon URL per filled network, or null when there is no usable base address. */
export function hostedSocialIcons(links: SocialLinks, baseUrl: string, color: string): SocialIconSources | null {
  if (!isAssetBaseUrl(baseUrl)) return null;
  const base = baseUrl.trim().replace(/\/+$/, '');
  const out: SocialIconSources = {};
  for (const n of filledSocialNetworks(links)) out[n.id] = `${base}/${socialIconFileName(n.id, color)}`;
  return out;
}
