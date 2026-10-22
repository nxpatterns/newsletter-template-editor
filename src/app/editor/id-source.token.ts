import { InjectionToken } from '@angular/core';
import { uuidV7, type IdSource } from '../../core/id/uuid-v7';

/** The app's one source of ids for stored objects (UUIDv7); tests can inject a fixed one. */
export const ID_SOURCE = new InjectionToken<IdSource>('IdSource', {
  providedIn: 'root',
  factory: () => uuidV7,
});
