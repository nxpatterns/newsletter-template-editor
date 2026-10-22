import { Injectable, signal } from '@angular/core';
import type { ResetInventory, ResetKind } from '../../../core/reset/reset-kinds';

export interface ResetDialogRequest {
  inventory: ResetInventory;
  /** Writes a backup file of these kinds; resolves to its file name, or null when it failed. */
  save: (kinds: ResetKind[]) => Promise<string | null>;
}

export interface ResetDialogResult {
  /** The checked kinds, in display order. */
  kinds: ResetKind[];
  /** Every available kind was checked ("Delete everything"). */
  everything: boolean;
  /** Last backup saved from the dialog, if any. */
  backupFile: string | null;
}

/** Opens the reset dialog (decisions 63 to 67) and resolves with the choice, or null for Cancel. */
@Injectable({ providedIn: 'root' })
export class ResetDialogService {
  private readonly pendingSignal = signal<(ResetDialogRequest & { resolve: (r: ResetDialogResult | null) => void }) | null>(
    null,
  );

  readonly pending = this.pendingSignal.asReadonly();

  open(req: ResetDialogRequest): Promise<ResetDialogResult | null> {
    this.complete(null);
    return new Promise((resolve) => this.pendingSignal.set({ ...req, resolve }));
  }

  complete(result: ResetDialogResult | null): void {
    const p = this.pendingSignal();
    if (!p) return;
    this.pendingSignal.set(null);
    p.resolve(result);
  }
}
