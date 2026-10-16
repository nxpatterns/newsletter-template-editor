import { Injectable, signal } from '@angular/core';
import {
  recolorSvg,
  SOCIAL_ICON_DIR,
  SOCIAL_ICON_PX,
  SOCIAL_NETWORKS,
  socialIconFileName,
  type SocialIconSources,
  type SocialNetworkId,
} from '../../core';

/** Burned PNGs are twice the displayed size, so icons stay sharp on high-density screens. */
const BURN_SCALE = 2;

/** Loads the SVG icons from public/icons/social once; colors them for preview and export. */
@Injectable({ providedIn: 'root' })
export class SocialIconsService {
  private readonly svgs = signal<Partial<Record<SocialNetworkId, string>>>({});
  private loading: Promise<void> | null = null;

  /** Starts loading all icons (idempotent); the preview re-renders when they arrive. */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      SOCIAL_NETWORKS.map(async (n) => {
        try {
          const res = await fetch(`${SOCIAL_ICON_DIR}/${n.id}.svg`);
          return res.ok ? ([n.id, await res.text()] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      const map: Partial<Record<SocialNetworkId, string>> = {};
      for (const p of pairs) if (p) map[p[0]] = p[1];
      this.svgs.set(map);
    });
    return this.loading;
  }

  /** Colored SVG data URLs for the editor preview (reactive). */
  previewSources(color: string): SocialIconSources {
    const out: SocialIconSources = {};
    for (const [id, svg] of Object.entries(this.svgs()) as [SocialNetworkId, string][]) {
      out[id] = svgDataUrl(recolorSvg(svg, color));
    }
    return out;
  }

  /** PNG bytes of one icon in `color`, at twice the email size. */
  async burnPng(id: SocialNetworkId, color: string): Promise<Uint8Array> {
    await this.load();
    const svg = this.svgs()[id];
    if (!svg) throw new Error(`missing icon ${id}`);
    const img = new Image();
    img.src = svgDataUrl(recolorSvg(svg, color));
    await img.decode();
    const px = SOCIAL_ICON_PX * BURN_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    canvas.getContext('2d')!.drawImage(img, 0, 0, px, px);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('png encode failed');
    return new Uint8Array(await blob.arrayBuffer());
  }

  fileName(id: SocialNetworkId, color: string): string {
    return socialIconFileName(id, color);
  }
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
