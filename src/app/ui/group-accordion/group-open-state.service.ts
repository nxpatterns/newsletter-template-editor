import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** UI-only open group ids per panel tab (localStorage). Same for every template; never exported. */
export const GROUP_OPEN_KEY = 'newsletter-template-editor.group-open.v1';

type OpenMap = Readonly<Record<string, readonly string[]>>;

/** Remembers which group accordions are open, per tab. Everything starts closed. */
@Injectable({ providedIn: 'root' })
export class GroupOpenState {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly state = signal<OpenMap>(this.read());

  isOpen(tab: string, id: string): boolean {
    return this.state()[tab]?.includes(id) ?? false;
  }

  toggle(tab: string, id: string): void {
    this.setOpen(tab, id, !this.isOpen(tab, id));
  }

  setOpen(tab: string, id: string, open: boolean): void {
    if (this.isOpen(tab, id) === open) return;
    const ids = this.state()[tab] ?? [];
    const next = { ...this.state(), [tab]: open ? [...ids, id] : ids.filter((x) => x !== id) };
    this.state.set(next);
    this.write(next);
  }

  private read(): OpenMap {
    if (!this.browser) return {};
    try {
      const parsed = JSON.parse(localStorage.getItem(GROUP_OPEN_KEY) ?? '{}') as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out: Record<string, string[]> = {};
      for (const [tab, ids] of Object.entries(parsed)) {
        if (Array.isArray(ids))
          out[tab] = ids.filter((x): x is string => typeof x === 'string' && x.length < 120);
      }
      return out;
    } catch {
      return {};
    }
  }

  private write(next: OpenMap): void {
    if (!this.browser) return;
    try {
      localStorage.setItem(GROUP_OPEN_KEY, JSON.stringify(next));
    } catch {
      // quota / private mode
    }
  }
}
