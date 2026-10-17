import type { SocialNetworkId } from '../../../core';

/** Network brand color for the icon and the tile it sits on. */
export interface SocialBrandTile {
  readonly icon: string;
  readonly tile: string;
}

const LIGHT_TILE = '#ffffff';

/**
 * Original brand colors, used only in the editor's Social tab.
 * The export keeps drawing every icon in the Primary color.
 */
export const SOCIAL_BRAND_TILES: Readonly<Record<SocialNetworkId, SocialBrandTile>> = {
  linkedin: { icon: '#0a66c2', tile: LIGHT_TILE },
  facebook: { icon: '#0866ff', tile: LIGHT_TILE },
  instagram: { icon: '#ff0069', tile: LIGHT_TILE },
  x: { icon: '#000000', tile: LIGHT_TILE },
  youtube: { icon: '#ff0000', tile: LIGHT_TILE },
  tiktok: { icon: '#000000', tile: LIGHT_TILE },
  threads: { icon: '#000000', tile: LIGHT_TILE },
  pinterest: { icon: '#bd081c', tile: LIGHT_TILE },
  vimeo: { icon: '#1ab7ea', tile: LIGHT_TILE },
  dailymotion: { icon: '#0a0a0a', tile: LIGHT_TILE },
  // Snapchat yellow would vanish on white: its own yellow tile with the dark ghost, as the brand shows it.
  snapchat: { icon: '#000000', tile: '#fffc00' },
  whatsapp: { icon: '#25d366', tile: LIGHT_TILE },
};
