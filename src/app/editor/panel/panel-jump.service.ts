import { afterNextRender, DOCUMENT, inject, Injectable, Injector } from '@angular/core';
import { GroupOpenState } from '../../ui/group-accordion/group-open-state.service';
import type { JumpTarget } from '../blocks/overview-tree';
import { NewsletterSession } from '../newsletter-session.service';

const GLOW_CLASS = 'is-jump-target';

/** Opens the panel tab where something is edited, opens its group and lets the target glow once. */
@Injectable({ providedIn: 'root' })
export class PanelJump {
  private readonly session = inject(NewsletterSession);
  private readonly openState = inject(GroupOpenState);
  private readonly injector = inject(Injector);
  private readonly doc = inject(DOCUMENT);

  go(target: JumpTarget): void {
    if (target.groupId) this.openState.setOpen(target.tab, target.groupId, true);
    this.session.setPanelTab(target.tab);
    afterNextRender({ write: () => this.glow(target.testId) }, { injector: this.injector });
  }

  private glow(testId: string): void {
    const panel = this.doc.querySelector('[data-testid="editor-panel"]');
    const el = panel?.querySelector<HTMLElement>(`[data-testid="${CSS.escape(testId)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
    el.classList.remove(GLOW_CLASS);
    void el.offsetWidth; // restart the animation when the same target is opened twice
    el.classList.add(GLOW_CLASS);
    el.addEventListener('animationend', () => el.classList.remove(GLOW_CLASS), { once: true });
  }
}
