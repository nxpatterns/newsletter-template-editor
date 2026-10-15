import { optimizeLogoForHtmlExport } from '../logo/logo-pipeline';
import type { Newsletter } from '../types';
import { renderBlocks } from './blocks';
import { emailDocumentCss } from './email-css';
import { inlineEmailCss, inlineEmailCssFragment } from './inline-email-css';
import { renderExportShell, renderPreviewDoc } from './shell';
import { resolveListMonkForPreview } from './utils';

export interface ExportArtifacts {
  /** Standalone HTML with shell + content (CSS inlined for mail clients) */
  full: string;
  /** Content rows only (ListMonk campaign body), styles inlined */
  body: string;
  /** Shell with `{{ template "content" . }}` placeholder (CSS inlined) */
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
  // Preview keeps classes + stylesheet (no export inliner).
  return resolveListMonkForPreview(doc, newsletter.globals.campaignSubject || 'Newsletter preview');
}

/** Sync export using current globals (preview-quality logo master). Prefer `renderExportOptimized` for downloads. */
export function renderExport(newsletter: Newsletter): ExportArtifacts {
  const bodyRows = renderBlocks(newsletter.blocks, {
    globals: newsletter.globals,
    mode: 'export',
    annotate: false,
  });
  const css = emailDocumentCss(newsletter.globals);
  const full = inlineEmailCss(renderExportShell(newsletter.globals, bodyRows));
  const standardTemplate = inlineEmailCss(
    renderExportShell(newsletter.globals, `{{ template "content" . }}`),
  );
  const body = inlineEmailCssFragment(bodyRows, css);
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
export { emailDocumentCss, darkModeCss, paragraphEditorSurfaceCss } from './email-css';
export { inlineEmailCss, inlineEmailCssFragment } from './inline-email-css';
export { EMAIL_CONTENT_WIDTH_PX, FONT_PRESETS, fontStack } from './utils';
export type { RenderMode } from './utils';
// renderExportOptimized is exported above
