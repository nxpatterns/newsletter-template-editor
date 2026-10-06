import type { Newsletter } from '../types';
import { renderBlocks } from './blocks';
import { renderExportShell, renderPreviewDoc } from './shell';
import { resolveListMonkForPreview } from './utils';

export interface ExportArtifacts {
  /** Standalone HTML with shell + content */
  full: string;
  /** Content rows only (ListMonk campaign body) */
  body: string;
  /** Shell with `{{ template "content" . }}` placeholder */
  standardTemplate: string;
}

export function renderPreview(newsletter: Newsletter): string {
  const bodyInner = renderBlocks(newsletter.blocks, {
    globals: newsletter.globals,
    mode: 'preview',
    annotate: true,
  });
  const doc = renderPreviewDoc(
    newsletter.globals,
    bodyInner,
    newsletter.globals.campaignSubject || 'Newsletter preview',
  );
  return resolveListMonkForPreview(doc, newsletter.globals.campaignSubject || 'Newsletter preview');
}

export function renderExport(newsletter: Newsletter): ExportArtifacts {
  const body = renderBlocks(newsletter.blocks, {
    globals: newsletter.globals,
    mode: 'export',
    annotate: false,
  });
  const full = renderExportShell(newsletter.globals, body);
  const standardTemplate = renderExportShell(
    newsletter.globals,
    `{{ template "content" . }}`,
  );
  return { full, body, standardTemplate };
}

export { renderBlocks, renderExportShell, renderPreviewDoc };
export type { RenderContext } from './blocks';
export { FONT_PRESETS, fontStack } from './utils';
export type { RenderMode } from './utils';
