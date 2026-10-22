import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { requestPersistentStorage, type PersistentStorageState } from '../../core/persist/persistent-storage';

/** Asks the browser for persistent storage; replaceable in tests. */
export const PERSISTENT_STORAGE_REQUEST = new InjectionToken<() => Promise<PersistentStorageState>>(
  'PersistentStorageRequest',
  { providedIn: 'root', factory: () => () => requestPersistentStorage() },
);

/** Requests persistent storage once, on the first save of a template or own block. */
@Injectable({ providedIn: 'root' })
export class StoragePersistence {
  private readonly request = inject(PERSISTENT_STORAGE_REQUEST);
  private readonly stateSignal = signal<PersistentStorageState | null>(null);
  private pending: Promise<PersistentStorageState> | null = null;

  /** Null until the first save asked; a later notice reads 'denied' or 'unsupported' from here. */
  readonly state = this.stateSignal.asReadonly();

  ensure(): Promise<PersistentStorageState> {
    this.pending ??= this.request().then((state) => {
      this.stateSignal.set(state);
      return state;
    });
    return this.pending;
  }
}
