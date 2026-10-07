import { optimizeLogoForHtmlExport } from '../logo/logo-pipeline';
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

/** Sync export using current globals (preview-quality logo master). Prefer `renderExportOptimized` for downloads. */
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

/** HTML export with logo scaled/compressed to the current display size. */
export async function renderExportOptimized(newsletter: Newsletter): Promise<ExportArtifacts> {
  const logo = await optimizeLogoForHtmlExport(newsletter.globals.logo);
  const prepared: Newsletter = {
    ...newsletter,
    globals: { ...newsletter.globals, logo },
  };
  return renderExport(prepared);
}

export { renderBlocks, renderExportShell, renderPreviewDoc };
export type { RenderContext } from './blocks';
export { FONT_PRESETS, fontStack } from './utils';
export type { RenderMode } from './utils';
// renderExportOptimized is exported above
