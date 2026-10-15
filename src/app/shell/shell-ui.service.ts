import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const PANEL_COLLAPSED_KEY = 'newsletter-template-editor.side-panel-collapsed.v1';
const PANEL_WIDTH_KEY = 'newsletter-template-editor.side-panel-width.v1';
const FIELD_HEIGHTS_KEY = 'newsletter-template-editor.field-heights.v1';
const BLOCK_MODAL_GEO_KEY = 'newsletter-template-editor.block-edit-modal-geo.v1';

export interface BlockModalGeometry {
  x: number;
  y: number;
  w: number;
  /** null = the dialog is as tall as its content (never resized by hand). */
  h: number | null;
}

/** Matches `--ds-panel-width: 21rem` at default root font size. */
export const PANEL_WIDTH_MIN_PX = 336;
export const PANEL_WIDTH_MAX_RATIO = 0.5;
const PANEL_WIDTH_DEFAULT_PX = PANEL_WIDTH_MIN_PX;

/** Matches `--ds-side-by-side-min: 60rem` (~960px). */
export const SIDE_BY_SIDE_MIN_PX = 960;

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly collapsedSignal = signal(false);
  private readonly widthPxSignal = signal(PANEL_WIDTH_DEFAULT_PX);
  private readonly fieldHeightsSignal = signal<Record<string, number>>({});
  private readonly blockModalGeoSignal = signal<Record<string, BlockModalGeometry>>({});

  /** true = panel body hidden (old-style collapse). */
  readonly panelCollapsed = this.collapsedSignal.asReadonly();

  /** Open panel width in CSS pixels (clamped on set). */
  readonly panelWidthPx = this.widthPxSignal.asReadonly();

  readonly panelWidthStyle = computed(() =>
    this.collapsedSignal() ? null : `${this.widthPxSignal()}px`,
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const rawCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY);
    if (rawCollapsed === '1' || rawCollapsed === 'true') {
      this.collapsedSignal.set(true);
    } else if (rawCollapsed === '0' || rawCollapsed === 'false') {
      this.collapsedSignal.set(false);
    } else if (this.isNarrowViewport()) {
      // Phones / undocked layout: start closed so the preview is usable first.
      this.collapsedSignal.set(true);
    }

    const rawWidth = localStorage.getItem(PANEL_WIDTH_KEY);
    if (rawWidth) {
      const parsed = Number(rawWidth);
      if (Number.isFinite(parsed)) this.widthPxSignal.set(this.clampWidth(parsed));
    }

    this.fieldHeightsSignal.set(this.readFieldHeights());
    this.blockModalGeoSignal.set(this.readBlockModalGeo());
  }

  togglePanel(): void {
    const next = !this.collapsedSignal();
    this.collapsedSignal.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(PANEL_COLLAPSED_KEY, next ? '1' : '0');
  }

  setPanelWidthPx(px: number): void {
    const next = this.clampWidth(px);
    this.widthPxSignal.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(PANEL_WIDTH_KEY, String(next));
  }

  clampWidth(px: number, viewportWidth = this.viewportWidth()): number {
    const max = Math.max(PANEL_WIDTH_MIN_PX, Math.floor(viewportWidth * PANEL_WIDTH_MAX_RATIO));
    return Math.min(max, Math.max(PANEL_WIDTH_MIN_PX, Math.round(px)));
  }

  /** Restored CSS pixel height for a resizable field, or null if unset. */
  getFieldHeightPx(key: string): number | null {
    const value = this.fieldHeightsSignal()[key];
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setFieldHeightPx(key: string, px: number): void {
    const next = Math.round(px);
    if (!key || !Number.isFinite(next) || next < 48) return;
    const map = { ...this.fieldHeightsSignal(), [key]: next };
    this.fieldHeightsSignal.set(map);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(FIELD_HEIGHTS_KEY, JSON.stringify(map));
    } catch {
      // quota / private mode
    }
  }

  /** Last dialog position/size for a block type key (e.g. `paragraph`). */
  getBlockModalGeometry(blockType: string): BlockModalGeometry | null {
    const g = this.blockModalGeoSignal()[blockType];
    if (!g) return null;
    if (![g.x, g.y, g.w].every((n) => Number.isFinite(n))) return null;
    if (g.h !== null && !Number.isFinite(g.h)) return null;
    return { ...g };
  }

  setBlockModalGeometry(blockType: string, geo: BlockModalGeometry): void {
    if (!blockType) return;
    const next: BlockModalGeometry = {
      x: Math.round(geo.x),
      y: Math.round(geo.y),
      w: Math.round(geo.w),
      h: geo.h === null ? null : Math.round(geo.h),
    };
    if (next.w < 320 || (next.h !== null && next.h < 240)) return;
    const map = { ...this.blockModalGeoSignal(), [blockType]: next };
    this.blockModalGeoSignal.set(map);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(BLOCK_MODAL_GEO_KEY, JSON.stringify(map));
    } catch {
      // quota / private mode
    }
  }

  private readBlockModalGeo(): Record<string, BlockModalGeometry> {
    try {
      const raw = localStorage.getItem(BLOCK_MODAL_GEO_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<string, BlockModalGeometry> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!key || !value || typeof value !== 'object') continue;
        const v = value as Record<string, unknown>;
        const x = Number(v['x']);
        const y = Number(v['y']);
        const w = Number(v['w']);
        const h = v['h'] === null ? null : Number(v['h']);
        if ([x, y, w].every((n) => Number.isFinite(n)) && w >= 320 && (h === null || (Number.isFinite(h) && h >= 240))) {
          out[key] = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: h === null ? null : Math.round(h) };
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  private readFieldHeights(): Record<string, number> {
    try {
      const raw = localStorage.getItem(FIELD_HEIGHTS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const n = Number(value);
        if (key && Number.isFinite(n) && n >= 48) out[key] = Math.round(n);
      }
      return out;
    } catch {
      return {};
    }
  }

  private isNarrowViewport(): boolean {
    return this.viewportWidth() < SIDE_BY_SIDE_MIN_PX;
  }

  private viewportWidth(): number {
    if (!isPlatformBrowser(this.platformId)) return 1280;
    return window.innerWidth || 1280;
  }
}
