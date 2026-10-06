import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const PANEL_COLLAPSED_KEY = 'newsletter-template-editor.side-panel-collapsed.v1';
const PANEL_WIDTH_KEY = 'newsletter-template-editor.side-panel-width.v1';
const INSPECTOR_HEIGHT_KEY = 'newsletter-template-editor.placed-inspector-height.v1';

/** Matches `--ds-panel-width: 21rem` at default root font size. */
export const PANEL_WIDTH_MIN_PX = 336;
export const PANEL_WIDTH_MAX_RATIO = 0.5;
const PANEL_WIDTH_DEFAULT_PX = PANEL_WIDTH_MIN_PX;

/** Placed-tab inspector pane height. */
export const INSPECTOR_HEIGHT_MIN_PX = 140;
export const INSPECTOR_HEIGHT_MAX_RATIO = 0.5;
const INSPECTOR_HEIGHT_DEFAULT_PX = 220;

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly collapsedSignal = signal(false);
  private readonly widthPxSignal = signal(PANEL_WIDTH_DEFAULT_PX);
  private readonly inspectorHeightPxSignal = signal(INSPECTOR_HEIGHT_DEFAULT_PX);

  /** true = panel body hidden (old-style collapse). */
  readonly panelCollapsed = this.collapsedSignal.asReadonly();

  /** Open panel width in CSS pixels (clamped on set). */
  readonly panelWidthPx = this.widthPxSignal.asReadonly();

  /** Height of the placed-tab properties pane (px). */
  readonly inspectorHeightPx = this.inspectorHeightPxSignal.asReadonly();

  readonly panelWidthStyle = computed(() =>
    this.collapsedSignal() ? null : `${this.widthPxSignal()}px`,
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const rawCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY);
    if (rawCollapsed === '1' || rawCollapsed === 'true') this.collapsedSignal.set(true);
    const rawWidth = localStorage.getItem(PANEL_WIDTH_KEY);
    if (rawWidth) {
      const parsed = Number(rawWidth);
      if (Number.isFinite(parsed)) this.widthPxSignal.set(this.clampWidth(parsed));
    }
    const rawInspector = localStorage.getItem(INSPECTOR_HEIGHT_KEY);
    if (rawInspector) {
      const parsed = Number(rawInspector);
      if (Number.isFinite(parsed)) this.inspectorHeightPxSignal.set(parsed);
    }
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

  setInspectorHeightPx(px: number, containerHeightPx?: number): void {
    const next = this.clampInspectorHeight(px, containerHeightPx);
    this.inspectorHeightPxSignal.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(INSPECTOR_HEIGHT_KEY, String(next));
  }

  clampWidth(px: number, viewportWidth = this.viewportWidth()): number {
    const max = Math.max(PANEL_WIDTH_MIN_PX, Math.floor(viewportWidth * PANEL_WIDTH_MAX_RATIO));
    return Math.min(max, Math.max(PANEL_WIDTH_MIN_PX, Math.round(px)));
  }

  clampInspectorHeight(px: number, containerHeightPx = 480): number {
    const max = Math.max(
      INSPECTOR_HEIGHT_MIN_PX,
      Math.floor(containerHeightPx * INSPECTOR_HEIGHT_MAX_RATIO),
    );
    return Math.min(max, Math.max(INSPECTOR_HEIGHT_MIN_PX, Math.round(px)));
  }

  private viewportWidth(): number {
    if (!isPlatformBrowser(this.platformId)) return 1280;
    return window.innerWidth || 1280;
  }
}
