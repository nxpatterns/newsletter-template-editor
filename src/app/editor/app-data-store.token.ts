import { InjectionToken } from '@angular/core';
import { indexedDbAppDataStore, type AppDataStore } from '../../core/reset/app-data-store';

/** All stored data as one whole for the reset dialog and its backup file; swap the factory for a cloud store later. */
export const APP_DATA_STORE = new InjectionToken<AppDataStore>('AppDataStore', {
  providedIn: 'root',
  factory: () => indexedDbAppDataStore,
});
