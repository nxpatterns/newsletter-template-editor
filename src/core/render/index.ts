import { optimizeLogoForHtmlExport } from '../logo/logo-pipeline';
import type { SocialIconSources } from '../brand/social';
import type { Newsletter } from '../types';
import { renderBlocks } from './blocks';
import { renderPalette } from './colors';
import { emailDocumentCss } from './email-css';
import { inlineEmailCss, inlineEmailCssFragment } from './inline-email-css';
import { renderExportShell, renderPreviewDoc } from './shell';
import { escapeAttr, escapeHtml, resolveListMonkForPreview } from './utils';

export interface ExportArtifacts {
  /** Standalone HTML with shell + content (CSS inlined for mail clients) */
  full: string;
  /** Content rows only (ListMonk campaign body), styles inlined */
  body: string;
  /** Shell with `{{ template "content" . }}` placeholder (CSS inlined) */
  standardTemplate: string;
}

export interface PreviewOptions {
  /** Empty newsletter: text of the dashed slot below the header (editor preview only). */
  emptySlotLabel?: string;
  /** Colored icon per social network (data URLs); without them the footer shows text links. */
  socialIcons?: SocialIconSources;
}

export interface ExportOptions {
  /** Hosted PNG per social network; without them the footer shows text links. */
  socialIcons?: SocialIconSources;
}

export function renderPreview(newsletter: Newsletter, opts: PreviewOptions = {}): string {
  const bodyInner = newsletter.blocks.length
    ? renderBlocks(newsletter.blocks, { globals: newsletter.globals, mode: 'preview', annotate: true })
    : renderEmptySlot(newsletter, opts.emptySlotLabel ?? '');
  const doc = renderPreviewDoc(
    newsletter.globals,
    bodyInner,
    newsletter.globals.campaignSubject || 'Newsletter preview',
    opts.socialIcons,
    newsletter.blocks,
  );
  // Preview keeps classes + stylesheet (no export inliner).
  return resolveListMonkForPreview(doc, newsletter.globals.campaignSubject || 'Newsletter preview');
}

/** Drop target for the first block; never part of an export. */
function renderEmptySlot(newsletter: Newsletter, label: string): string {
  const bg = escapeAttr(renderPalette(newsletter.globals).content);
  return `<tr class="nte-empty-slot"><td bgcolor="${bg}" class="mobile-padding content-bg block-pad-md"><div class="nte-empty-slot-box">${escapeHtml(label)}</div></td></tr>`;
}

/** Sync export using current globals (preview-quality logo master). Prefer `renderExportOptimized` for downloads. */
export function renderExport(newsletter: Newsletter, opts: ExportOptions = {}): ExportArtifacts {
  const bodyRows = renderBlocks(newsletter.blocks, {
    globals: newsletter.globals,
    mode: 'export',
    annotate: false,
  });
  const css = emailDocumentCss(newsletter.globals, newsletter.blocks);
  const full = inlineEmailCss(renderExportShell(newsletter.globals, bodyRows, opts.socialIcons, newsletter.blocks));
  const standardTemplate = inlineEmailCss(
    renderExportShell(newsletter.globals, `{{ template "content" . }}`, opts.socialIcons, newsletter.blocks),
  );
  const body = inlineEmailCssFragment(bodyRows, css);
  return { full, body, standardTemplate };
}

/** HTML export with logo scaled/compressed to the current display size. */
export async function renderExportOptimized(newsletter: Newsletter, opts: ExportOptions = {}): Promise<ExportArtifacts> {
  const logo = await optimizeLogoForHtmlExport(newsletter.globals.logo);
  const prepared: Newsletter = {
    ...newsletter,
    globals: { ...newsletter.globals, logo },
  };
  return renderExport(prepared, opts);
}

export { renderBlocks, renderExportShell, renderPreviewDoc };
export type { RenderContext } from './blocks';
export { emailDocumentCss, darkModeCss, paragraphEditorSurfaceCss } from './email-css';
export { inlineEmailCss, inlineEmailCssFragment } from './inline-email-css';
export { EMAIL_CONTENT_WIDTH_PX, FONT_PRESETS, fontStack } from './utils';
export type { RenderMode } from './utils';
// renderExportOptimized is exported above
