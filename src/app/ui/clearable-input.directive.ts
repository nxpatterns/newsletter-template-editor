import { Directive, DoCheck, ElementRef, inject } from '@angular/core';

/** Input types that hold free text and get the clear (×) affordance. */
const CLEARABLE_TYPES = new Set(['', 'text', 'url', 'email', 'tel', 'search']);

/** Width of the × hit area at the inline end of the field, in px. */
const HIT_WIDTH = 26;

/**
 * Shows a × at the end of a filled text field; clicking it empties the field.
 * The × is drawn by `.ed-input--clearable` in the editor form styles, so the
 * field keeps its place in any grid. Clearing fires a normal `input` event,
 * so the component's own handler records the change and undo still works.
 */
@Directive({
  selector: 'input.ed-input',
  host: {
    '(input)': 'sync()',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'setOver(false)',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ClearableInputDirective implements DoCheck {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  ngDoCheck(): void {
    this.sync();
  }

  protected sync(): void {
    const on = CLEARABLE_TYPES.has(this.el.getAttribute('type') ?? '') && !this.el.readOnly && !this.el.disabled && this.el.value !== '';
    this.el.classList.toggle('ed-input--clearable', on);
    if (!on) this.setOver(false);
  }

  protected setOver(over: boolean): void {
    this.el.classList.toggle('ed-input--clear-hover', over);
  }

  protected onPointerMove(event: PointerEvent): void {
    this.setOver(this.inHitArea(event));
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.inHitArea(event)) return;
    event.preventDefault();
    this.el.value = '';
    this.el.dispatchEvent(new Event('input', { bubbles: true }));
    this.el.focus();
  }

  private inHitArea(event: PointerEvent): boolean {
    if (!this.el.classList.contains('ed-input--clearable')) return false;
    const rect = this.el.getBoundingClientRect();
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    return rtl ? event.clientX <= rect.left + HIT_WIDTH : event.clientX >= rect.right - HIT_WIDTH;
  }
}
