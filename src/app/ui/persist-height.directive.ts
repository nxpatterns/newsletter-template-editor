import {
  afterNextRender,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { ShellUiService } from '../shell/shell-ui.service';

/**
 * Persists the CSS height of a user-resizable control (e.g. textarea) in localStorage.
 * Usage: `<textarea appPersistHeight="campaign.preheader" rows="3">`
 */
@Directive({
  selector: '[appPersistHeight]',
})
export class PersistHeightDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly shellUi = inject(ShellUiService);
  private ro: ResizeObserver | null = null;
  private applying = false;
  private lastSaved = 0;

  /** Storage key fragment (namespaced under field-heights). */
  readonly appPersistHeight = input.required<string>();

  constructor() {
    afterNextRender(() => {
      const key = this.appPersistHeight();
      const node = this.el.nativeElement;
      if (!key || !node) return;

      const saved = this.shellUi.getFieldHeightPx(key);
      if (saved) {
        this.applying = true;
        node.style.height = `${saved}px`;
        this.lastSaved = saved;
        queueMicrotask(() => {
          this.applying = false;
        });
      }

      if (typeof ResizeObserver === 'undefined') return;
      this.ro = new ResizeObserver((entries) => {
        if (this.applying) return;
        const entry = entries[0];
        const height = Math.round(entry?.contentRect.height ?? node.getBoundingClientRect().height);
        if (!Number.isFinite(height) || height < 48) return;
        if (Math.abs(height - this.lastSaved) < 2) return;
        this.lastSaved = height;
        this.shellUi.setFieldHeightPx(key, height);
      });
      this.ro.observe(node);
    });
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.ro = null;
  }
}
