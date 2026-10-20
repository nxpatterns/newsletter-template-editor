import { Component, HostListener, effect, inject } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { SnackbarService, SnackbarTone } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);
  private readonly i18n = inject(LocaleService);

  protected get dismissLabel(): string {
    return this.i18n.t('snackbar.dismiss');
  }

  protected get olderLabel(): string {
    return this.i18n.t('snackbar.older');
  }

  protected get newerLabel(): string {
    return this.i18n.t('snackbar.newer');
  }

  protected toneLabel(tone: SnackbarTone): string {
    return this.i18n.t(`snackbar.tone.${tone}`);
  }

  /*
    Timer pauses while the pointer is over the bar OR focus is inside it, and resumes only when both end.
    Paging can disable or remove the focused button; that blur must not restart the timer under the pointer.
  */
  private hovered = false;
  private focused = false;

  constructor() {
    // The bar is gone (no mouseleave/focusout fires): start clean for the next message.
    effect(() => {
      if (!this.snackbar.message()) this.hovered = this.focused = false;
    });
  }

  protected onPointer(inside: boolean): void {
    this.hovered = inside;
    this.syncTimer();
  }

  protected onFocusIn(): void {
    this.focused = true;
    this.syncTimer();
  }

  protected onFocusOut(event: FocusEvent): void {
    const bar = event.currentTarget as HTMLElement;
    this.focused = event.relatedTarget instanceof Node && bar.contains(event.relatedTarget);
    this.syncTimer();
  }

  private syncTimer(): void {
    if (this.hovered || this.focused) this.snackbar.pauseTimer();
    else this.snackbar.resumeTimer();
  }

  protected dismiss(): void {
    this.snackbar.dismiss();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.snackbar.message()) {
      this.snackbar.dismiss();
    }
  }
}
