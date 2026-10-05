import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly panelOpenSignal = signal(true);

  readonly panelOpen = this.panelOpenSignal.asReadonly();

  togglePanel(): void {
    this.panelOpenSignal.update((open) => !open);
  }

  setPanelOpen(open: boolean): void {
    this.panelOpenSignal.set(open);
  }
}
