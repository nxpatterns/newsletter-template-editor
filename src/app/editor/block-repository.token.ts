import { InjectionToken } from '@angular/core';
import { indexedDbBlockRepository, type BlockRepository } from '../../core/own-blocks/block-repository';

/** Storage for own blocks, their versions and drafts; swap the factory for a cloud repository later. */
export const BLOCK_REPOSITORY = new InjectionToken<BlockRepository>('BlockRepository', {
  providedIn: 'root',
  factory: () => indexedDbBlockRepository,
});
