import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const PANEL_COLLAPSED_KEY = 'newsletter-template-editor.side-panel-collapsed.v1';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly collapsedSignal = signal(false);

  /** true = panel body hidden (dogan-style collapse). */
  readonly panelCollapsed = this.collapsedSignal.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem(PANEL_COLLAPSED_KEY);
    if (raw === '1' || raw === 'true') this.collapsedSignal.set(true);
  }

  togglePanel(): void {
    const next = !this.collapsedSignal();
    this.collapsedSignal.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(PANEL_COLLAPSED_KEY, next ? '1' : '0');
  }
}
