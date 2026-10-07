import { Injectable, signal } from '@angular/core';
import type { Block } from '../../../core';

/**
 * Host-side drag session for All-blocks → preview.
 * Avoids putting catalog types in text/plain (Chrome would offer them to the
 * address bar / new-tab search). Escape or drop outside → cancelled.
 */
@Injectable({ providedIn: 'root' })
export class CatalogDragService {
  private readonly typeSignal = signal<Block['type'] | null>(null);
  private accepted = false;

  /** Active catalog type while dragging, else null. */
  readonly activeType = this.typeSignal.asReadonly();

  begin(type: Block['type']): void {
    this.accepted = false;
    this.typeSignal.set(type);
  }

  /** Call when the preview successfully inserts the block. */
  accept(): void {
    this.accepted = true;
  }

  /**
   * End the session. Returns whether the drop was accepted inside the editor.
   * Always clears active type.
   */
  end(): 'accepted' | 'cancelled' {
    const result = this.accepted && this.typeSignal() ? 'accepted' : 'cancelled';
    this.accepted = false;
    this.typeSignal.set(null);
    return result;
  }

  isActive(): boolean {
    return this.typeSignal() !== null;
  }
}
