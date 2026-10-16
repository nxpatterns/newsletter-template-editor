import { InjectionToken } from '@angular/core';
import { indexedDbTemplateRepository, type TemplateRepository } from '../../core/persist/template-repository';

/** Storage for templates and the draft; swap the factory for a cloud repository later. */
export const TEMPLATE_REPOSITORY = new InjectionToken<TemplateRepository>('TemplateRepository', {
  providedIn: 'root',
  factory: () => indexedDbTemplateRepository,
});
