import { isFramePartShown, type Block, type BrandName, type BrandStars, type FramePart, type Globals, type LogoConfig } from '../types';
import { filledSocialNetworks, SOCIAL_ICON_PX, type SocialIconSources } from '../brand/social';
import { colorScopeClass, FOOTER_TARGET, HEADER_TARGET, renderPalette, slotHex } from './colors';
import { emailDocumentCss } from './email-css';
import { attrHref, EMAIL_CONTENT_WIDTH_PX, EMAIL_TEXT_WIDTH_PX, escapeAttr, escapeHtml, fontStack, resolveHref, type RenderMode } from './utils';

export { emailDocumentCss, darkModeCss } from './email-css';

function renderLogo(logo: LogoConfig | undefined): string {
  if (!logo || !logo.src) return '';
  const h = Math.max(16, Math.round(logo.heightPx || 48));
  const alt = escapeAttr(logo.alt || '');
  const widthAttr = logo.widthPx ? ` width="${Math.round(logo.widthPx)}"` : '';
  const wCss = logo.widthPx ? `${Math.round(logo.widthPx)}px` : 'auto';
  const imgTag = `<img src="${escapeAttr(logo.src)}" alt="${alt}" height="${h}"${widthAttr} class="email-logo" style="--logo-h:${h}px;--logo-w:${wCss}">`;
  if (logo.href) {
    return `<a href="${escapeAttr(logo.href)}" target="_blank" class="email-logo-link">${imgTag}</a>`;
  }
  return imgTag;
}

/** "★ ★ ★" for the header and footer; empty when the count is 0. */
export function brandStarsText(stars: BrandStars | undefined): string {
  if (!stars || stars.count < 1) return '';
  return Array.from({ length: stars.count }, () => stars.symbol).join(' ');
}

const BRAND_NAME_PX: Record<BrandName['size'], number> = { s: 16, m: 20, l: 24 };

/** One inline-styled span per part: the colors are the brand's own, not theme tokens. */
export function renderBrandName(name: BrandName | undefined): string {
  if (!name) return '';
  const px = BRAND_NAME_PX[name.size] ?? BRAND_NAME_PX.m;
  const weight = name.bold ? 700 : 400;
  return name.parts
    .filter((p) => p.text)
    .map(
      (p) =>
        `<span style="font-family:Helvetica,Arial,sans-serif;font-size:${px}px;font-weight:${weight};color:${escapeAttr(p.color)};letter-spacing:1px">${escapeHtml(p.text)}</span>`,
    )
    .join('');
}

/**
 * Footer social row: icons when every filled network has an icon source, else text links
 * ("LinkedIn · Instagram"), which work in every inbox without hosted images.
 */
export function renderSocialRow(globals: Globals, mode: RenderMode, icons?: SocialIconSources): string {
  const links = globals.legal.social;
  const filled = filledSocialNetworks(links);
  if (!filled.length) return '';
  const asIcons = !!icons && filled.every((n) => icons[n.id]);
  const items = filled.map((n) => {
    const href = attrHref(resolveHref(links[n.id], mode), mode);
    const inner = asIcons
      ? `<img src="${escapeAttr(icons![n.id]!)}" alt="${escapeAttr(n.label)}" width="${SOCIAL_ICON_PX}" height="${SOCIAL_ICON_PX}" class="footer-social-icon">`
      : escapeHtml(n.label);
    return `<a href="${href}" target="_blank" class="${asIcons ? 'footer-social-link' : 'email-footer-link'}">${inner}</a>`;
  });
  return `<p class="footer-social${asIcons ? ' footer-social--icons' : ''}" data-field="legal.social">${items.join(
    asIcons ? '&nbsp;&nbsp;&nbsp;' : '&nbsp;·&nbsp;',
  )}</p>`;
}

/** A light set says so; a dark set stays open to both, as before. */
function colorSchemes(globals: Globals): string {
  return globals.colors.mode === 'light' ? 'light only' : 'light dark';
}

export function renderHeader(
  globals: Globals,
  mode: RenderMode,
  bodyInner: string,
  socialIcons?: SocialIconSources,
  blocks: readonly Block[] = [],
): string {
  const shown = (part: FramePart) => isFramePartShown(globals, part);
  const messageHref = mode === 'export' ? '{{ MessageURL }}' : '#';
  const logoHtml = shown('logo') ? renderLogo(globals.logo) : '';
  const pageBg = escapeAttr(renderPalette(globals).page);
  const headerBg = slotHex(globals, HEADER_TARGET, 'background');
  const footerBg = slotHex(globals, FOOTER_TARGET, 'background');
  const headerScope = colorScopeClass(globals, HEADER_TARGET.id);
  const footerScope = colorScopeClass(globals, FOOTER_TARGET.id);
  const starsText = escapeHtml(brandStarsText(globals.brand?.stars));
  const starsRow = starsText && shown('starsTop')
    ? `<p class="brand-stars" data-field="brand.stars">${starsText}</p>`
    : '';
  const brandNameRow = shown('brandName')
    ? `<span data-field="brand.name">${renderBrandName(globals.brand?.name)}</span>`
    : '';
  const legal = globals.legal;
  const unsubHref = mode === 'export' ? '{{ UnsubscribeURL }}' : '#';
  const privacyHref = attrHref(resolveHref(legal.privacyHref, mode), mode);
  const imprintHref = attrHref(resolveHref(legal.imprintHref, mode), mode);
  const companySiteHref = legal.companyWebsiteHref
    ? attrHref(resolveHref(legal.companyWebsiteHref, mode), mode)
    : '';
  const companyName = escapeHtml(legal.companyName || '');
  const companySiteLabel = escapeHtml(legal.companyWebsiteLabel || '');
  const companyRow = companySiteHref && companySiteLabel
    ? `${companyName}${companyName ? '&nbsp;·&nbsp;' : ''}<a href="${companySiteHref}" target="_blank" class="email-footer-link" data-field="legal.companyWebsiteLabel">${companySiteLabel}</a>`
    : companyName;
  const viewInBrowserClass = logoHtml
    ? 'view-in-browser view-in-browser--after-logo'
    : 'view-in-browser';
  const viewInBrowserTop = shown('viewInBrowserTop')
    ? `<p class="${viewInBrowserClass}">
                        <a href="${messageHref}" target="_blank" class="email-muted-link">${escapeHtml(
                          legal.viewInBrowserLabel,
                        )}</a>
                      </p>`
    : '';
  const footerLinks = (
    [
      ['privacy', privacyHref, legal.privacyLabel],
      ['imprint', imprintHref, legal.imprintLabel],
      ['unsubscribe', unsubHref, legal.unsubscribeLabel],
      ['viewInBrowserBottom', messageHref, legal.viewInBrowserLabel],
    ] as const
  )
    .filter(([part]) => shown(part))
    .map(([, href, label]) => `<a href="${href}" target="_blank" class="email-footer-link">${escapeHtml(label)}</a>`);
  const noticeRow = shown('notice')
    ? `<tr>
              <td bgcolor="${footerBg}" class="mobile-padding footer-bg footer-notice-pad ${footerScope}">
                <p class="footer-notice text-dim" data-field="legal.noticeHtml">
                  ${legal.noticeHtml}
                </p>
              </td>
            </tr>`
    : '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${pageBg}" class="email-bg">
      <tr>
        <td align="center" bgcolor="${pageBg}" class="email-bg email-outer-pad">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${EMAIL_CONTENT_WIDTH_PX}" class="email-container">
            <tr>
              <td bgcolor="${headerBg}" class="mobile-padding header-bg ${headerScope}">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td valign="top" class="v-top">
                      ${starsRow}
                      ${brandNameRow}
                    </td>
                    <td align="right" valign="top" class="t-right">
                      ${logoHtml}
                      ${viewInBrowserTop}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${bodyInner}
            ${noticeRow}
            <tr>
              <td bgcolor="${footerBg}" class="mobile-padding footer-bg footer-meta-pad ${footerScope}">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td class="footer-rule-cell">&nbsp;</td></tr>
                </table>
                ${shown('social') ? renderSocialRow(globals, mode, socialIcons) : ''}
                ${starsText && shown('starsBottom') ? `<p class="footer-stars-line">
                  <span class="footer-stars-glyph">${starsText}</span>
                </p>` : ''}
                ${shown('company') ? `<p class="footer-company text-dim" data-field="legal.companyName">
                  ${companyRow}
                </p>` : ''}
                ${footerLinks.length ? `<p class="footer-links">
                  ${footerLinks.join(`
                  &nbsp;|&nbsp;
                  `)}
                </p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderExportShell(
  globals: Globals,
  bodyInner: string,
  socialIcons?: SocialIconSources,
  blocks: readonly Block[] = [],
): string {
  const font = fontStack(globals);
  const preheader = escapeHtml(globals.preheader || '');
  const header = renderHeader(globals, 'export', bodyInner, socialIcons, blocks);
  const schemes = colorSchemes(globals);
  const pageBg = escapeAttr(renderPalette(globals).page);
  const lang = escapeAttr(globals.language || 'de');
  return `<!doctype html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="${schemes}" />
  <meta name="supported-color-schemes" content="${schemes}" />
  <title>{{ .Campaign.Subject }}</title>
  <style>${emailDocumentCss(globals, blocks)}</style>
</head>
<body bgcolor="${pageBg}" class="email-body" style="--email-page:${pageBg};font-family:${font}">
  <div class="preheader-hide">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
  {{ TrackView }}
  ${header}
</body>
</html>`;
}

/** Preview-only chrome. Interaction is wired by the host via contentDocument (no srcdoc scripts). */
const PREVIEW_EDITOR_CHROME = `
  /* No horizontal scrollbar: never expand layout for chrome gutters.
     Chrome sits outside the block via negative offsets; clip overflow instead of padding the body
     (body padding + width:100% tables was causing h-scroll). */
  html, body {
    overflow-x: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  /* Slightly widen the outer email frame padding so drag/edit/index can sit beside the 600px column when the iframe is wide enough. */
  table.email-bg > tbody > tr > td.email-bg {
    padding-left: 48px !important;
    padding-right: 128px !important;
  }
  tr.nte-block > td {
    position: relative;
    cursor: pointer;
    transition: box-shadow 0.12s ease, outline-color 0.12s ease;
  }
  /* Hover: dashed ice-blue */
  tr.nte-block:hover:not(.is-selected) > td {
    box-shadow: inset 0 0 0 2px rgba(126, 207, 255, 0.45);
    outline: 2px dashed #7ecfff;
    outline-offset: -2px;
  }
  /* Selected: solid turquoise */
  tr.nte-block.is-selected > td {
    box-shadow: inset 0 0 0 2px rgba(32, 212, 200, 0.95);
    outline: 2px solid #20d4c8;
    outline-offset: -2px;
  }
  /* Image block without a picture yet: a drop-target look, preview only. */
  .nte-image-empty {
    display: grid;
    place-items: center;
    width: 100%;
    max-width: var(--image-w, ${EMAIL_TEXT_WIDTH_PX}px);
    height: 140px;
    margin: 0 auto;
    box-sizing: border-box;
    border: 2px dashed rgba(126, 207, 255, 0.45);
    border-radius: 4px;
    background: rgba(126, 207, 255, 0.05);
  }
  .nte-image-empty::after {
    content: '🖼';
    font-size: 28px;
    line-height: 1;
  }
  /* Hairline dividers (thin, two-tone): a 10px grab zone above and below; the frame moves onto it. */
  .nte-hit {
    position: absolute;
    left: 0;
    right: 0;
    top: -10px;
    bottom: -10px;
    z-index: 20;
  }
  tr.nte-block:has(> td > .nte-hit) > td {
    box-shadow: none !important;
    outline: none !important;
  }
  tr.nte-block:hover:not(.is-selected) > td > .nte-hit {
    outline: 2px dashed #7ecfff;
    outline-offset: -2px;
    background: rgba(126, 207, 255, 0.06);
  }
  tr.nte-block.is-selected > td > .nte-hit {
    outline: 2px solid #20d4c8;
    outline-offset: -2px;
    background: rgba(32, 212, 200, 0.07);
  }
  tr.nte-block:hover > td > .nte-hit::after,
  tr.nte-block.is-selected > td > .nte-hit::after {
    content: attr(data-label);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 3px 8px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font: 600 11px/1 system-ui, -apple-system, sans-serif;
    color: #7ecfff;
    background: #0b1a2e;
    white-space: nowrap;
  }
  tr.nte-block.is-selected > td > .nte-hit::after {
    color: #20d4c8;
  }
  /* Shared chrome chip look — all sit OUTSIDE the block box */
  .nte-drag-handle,
  .nte-edit-btn,
  .nte-delete-btn,
  .nte-block-index {
    display: none !important;
    position: absolute;
    top: 0;
    z-index: 30;
    box-sizing: border-box;
    width: 34px;
    height: 34px;
    margin: 0;
    border: 1px solid rgba(126, 207, 255, 0.95);
    border-radius: 0.25rem;
    padding: 0;
    font: 700 14px/1 system-ui, -apple-system, sans-serif;
    color: #061018;
    background: #7ecfff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
  }
  /* Hover: index only. Selected: drag + index + edit + delete. */
  tr.nte-block:hover > td .nte-block-index,
  tr.nte-block.is-selected > td .nte-block-index {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  tr.nte-block.is-selected > td .nte-drag-handle,
  tr.nte-block.is-selected > td .nte-edit-btn,
  tr.nte-block.is-selected > td .nte-delete-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  /* Left of box: drag */
  .nte-drag-handle {
    left: -42px;
    right: auto;
    letter-spacing: -0.06em;
    cursor: grab;
    touch-action: none;
  }
  .nte-drag-handle:active { cursor: grabbing; }
  .nte-drag-handle:hover,
  .nte-edit-btn:hover { background: #a8e2ff; }
  .nte-delete-btn:hover { background: #ff9a6b; }
  .nte-drag-handle:focus-visible,
  .nte-edit-btn:focus-visible,
  .nte-delete-btn:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }
  /* Right of box: number, edit, delete */
  .nte-block-index {
    left: auto;
    right: -42px;
    min-width: 34px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
    pointer-events: none;
  }
  .nte-edit-btn {
    left: auto;
    right: -80px;
    font-size: 15px;
    cursor: pointer;
  }
  .nte-delete-btn {
    left: auto;
    right: -118px;
    font-size: 18px;
    font-weight: 800;
    color: #2a1008;
    border-color: rgba(255, 140, 90, 0.95);
    background: #ff8c4a;
    cursor: pointer;
  }
  tr.nte-block.is-selected > td .nte-block-index {
    border-color: rgba(32, 212, 200, 0.95);
    background: #20d4c8;
  }
  tr.nte-block.is-dragging {
    opacity: 0.45;
  }
  /* Insert gap color = gold highlight (NOT turquoise selection #20d4c8). */
  tr.nte-block {
    transition: transform 0.18s ease;
  }
  tr.nte-block.nte-drop-open-above {
    transform: translateY(-14px);
  }
  tr.nte-block.nte-drop-open-below {
    transform: translateY(14px);
  }
  /* Gold insert rail behind the label */
  tr.nte-block.nte-drop-before > td::before,
  tr.nte-block.nte-drop-after > td::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    z-index: 44;
    height: 3px;
    border-radius: 999px;
    background: #f5c518;
    box-shadow:
      0 0 0 4px rgba(245, 197, 24, 0.22),
      0 0 20px rgba(245, 197, 24, 0.45);
    pointer-events: none;
  }
  tr.nte-block.nte-drop-before > td::before { top: -2px; }
  tr.nte-block.nte-drop-after > td::after { bottom: -2px; }
  .nte-insert-label {
    display: none !important;
    position: absolute;
    left: 50%;
    z-index: 48;
    box-sizing: border-box;
    max-width: calc(100% - 24px);
    padding: 0.4rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    font: 800 12px/1.2 system-ui, -apple-system, sans-serif;
    letter-spacing: 0.03em;
    text-align: center;
    white-space: nowrap;
    color: #1a1200;
    background: #f5c518;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    transform: translateX(-50%);
  }
  tr.nte-block.nte-drop-before > td .nte-insert-label,
  tr.nte-block.nte-drop-after > td .nte-insert-label {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  tr.nte-block.nte-drop-before > td .nte-insert-label {
    top: 0;
    transform: translate(-50%, -50%);
  }
  tr.nte-block.nte-drop-after > td .nte-insert-label {
    bottom: 0;
    transform: translate(-50%, 50%);
  }
  body.nte-is-dnd {
    cursor: grabbing;
  }
  body.nte-is-catalog-dnd {
    cursor: copy;
  }
  /* Empty newsletter: quiet slot below the header; lights up as the insert target while dragging. */
  tr.nte-empty-slot > td {
    position: relative;
  }
  .nte-empty-slot-box {
    padding: 28px 16px;
    border: 2px dashed rgba(160, 180, 200, 0.35);
    border-radius: 8px;
    font: 600 14px/1.4 system-ui, -apple-system, sans-serif;
    text-align: center;
    color: rgba(200, 215, 230, 0.7);
  }
  tr.nte-empty-slot.nte-drop-before .nte-empty-slot-box {
    border-color: #f5c518;
    color: transparent;
  }
  tr.nte-empty-slot.nte-drop-before > td::before {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    top: 50%;
    z-index: 44;
    height: 3px;
    border-radius: 999px;
    background: #f5c518;
    box-shadow:
      0 0 0 4px rgba(245, 197, 24, 0.22),
      0 0 20px rgba(245, 197, 24, 0.45);
    pointer-events: none;
  }
  tr.nte-empty-slot.nte-drop-before > td .nte-insert-label {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  /* Append-at-end floating chip (label from data-nte-drop-append-label) */
  body.nte-drop-append {
    outline: none;
  }
  body.nte-drop-append::after {
    content: attr(data-nte-drop-append-label);
    position: fixed;
    left: 50%;
    bottom: 18px;
    z-index: 60;
    transform: translateX(-50%);
    box-sizing: border-box;
    min-width: min(280px, calc(100% - 32px));
    padding: 0.65rem 1.15rem;
    border: 2px solid #f5c518;
    border-radius: 999px;
    background: #f5c518;
    color: #1a1200;
    font: 800 13px/1.2 system-ui, -apple-system, sans-serif;
    letter-spacing: 0.02em;
    text-align: center;
    pointer-events: none;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  }
  tr.nte-block.nte-just-inserted > td {
    animation: nte-insert-flash 0.55s ease;
  }
  @keyframes nte-insert-flash {
    0% { box-shadow: inset 0 0 0 3px rgba(245, 197, 24, 0.95); }
    100% { box-shadow: inset 0 0 0 2px rgba(32, 212, 200, 0.95); }
  }
  @media (prefers-reduced-motion: reduce) {
    tr.nte-block { transition: none; }
    tr.nte-block.nte-drop-open-above,
    tr.nte-block.nte-drop-open-below { transform: none; }
    tr.nte-block.nte-just-inserted > td { animation: none; }
  }
`;

export function renderPreviewDoc(
  globals: Globals,
  bodyInner: string,
  subject: string,
  socialIcons?: SocialIconSources,
  blocks: readonly Block[] = [],
): string {
  const font = fontStack(globals);
  const preheader = escapeHtml(globals.preheader || '');
  const header = renderHeader(globals, 'preview', bodyInner, socialIcons, blocks);
  const pageBg = escapeAttr(renderPalette(globals).page);
  const schemes = colorSchemes(globals);
  return `<!doctype html>
<html lang="${escapeAttr(globals.language || 'de')}">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="${schemes}" />
  <meta name="supported-color-schemes" content="${schemes}" />
  <title>${escapeHtml(subject || 'Preview')}</title>
  <style>${emailDocumentCss(globals, blocks)}${PREVIEW_EDITOR_CHROME}</style>
</head>
<body bgcolor="${pageBg}" class="email-body" style="--email-page:${pageBg};font-family:${font}">
  <div class="preheader-hide">${preheader}</div>
  ${header}
</body>
</html>`;
}

/** Words around the block in the block editor preview. */
export interface BlockPreviewLabels {
  /** Stand-ins for the neighbours in a template, e.g. "… block before …". */
  before: string;
  after: string;
  /** Tag on the block's top left (its name) and top right (its type). */
  name: string;
  type: string;
  /** Badge at the bottom right when the structure cannot change (clone mode). */
  locked?: string;
}

const LOCK_ICON =
  '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"/></svg>';

const BLOCK_PREVIEW_CHROME = `
  html, body { margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; }
  table.email-bg > tbody > tr > td.email-bg { padding: 28px 16px !important; }
  tr.nte-block > td { position: relative; outline: 2px solid #20d4c8; outline-offset: -2px; }
  .nte-ctx { padding: 14px 16px; text-align: center; font: italic 13px/1.4 Georgia, serif; opacity: 0.7; }
  .nte-tag { position: absolute; z-index: 5; display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 3px; font: 600 11px/1.35 system-ui, -apple-system, sans-serif; letter-spacing: 0.01em; color: #04201e; background: #20d4c8; white-space: nowrap; pointer-events: none; }
  .nte-tag--name { top: -10px; left: -2px; }
  .nte-tag--type { top: -10px; right: -2px; }
  .nte-tag--lock { bottom: 6px; right: 6px; color: #ffffff; background: rgba(8, 16, 30, 0.82); }
  .nte-tag--lock svg { display: block; }
  .nte-image-empty { display: inline-block; width: var(--image-w, 100%); max-width: 100%; height: 120px; border-radius: 4px; background: repeating-linear-gradient(135deg, rgba(126, 207, 255, 0.14) 0 10px, rgba(126, 207, 255, 0.06) 10px 20px); }
`;

/**
 * Block editor preview: one block in the 600 px column with stand-ins for its neighbours, in the
 * template's colors. Preview only; never part of an export.
 */
export function renderBlockPreviewDoc(globals: Globals, blocks: readonly Block[], rows: string, labels: BlockPreviewLabels): string {
  const palette = renderPalette(globals);
  const pageBg = escapeAttr(palette.page);
  const contentBg = escapeAttr(palette.content);
  const ctx = (text: string) =>
    `<tr><td bgcolor="${contentBg}" class="content-bg"><div class="nte-ctx" style="color:${escapeAttr(palette.dim)}">${escapeHtml(text)}</div></td></tr>`;
  const tags =
    `<span class="nte-tag nte-tag--name">${escapeHtml(labels.name)}</span>` +
    `<span class="nte-tag nte-tag--type">${escapeHtml(labels.type)}</span>` +
    (labels.locked ? `<span class="nte-tag nte-tag--lock" data-testid="block-preview-locked">${LOCK_ICON}${escapeHtml(labels.locked)}</span>` : '');
  const framed = rows.replace(/(<tr class="nte-block[^"]*"[^>]*>\s*<td[^>]*>)/, `$1${tags}`);
  return `<!doctype html>
<html lang="${escapeAttr(globals.language || 'de')}">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="${colorSchemes(globals)}" />
  <title>${escapeHtml(labels.name)}</title>
  <style>${emailDocumentCss(globals, blocks)}${BLOCK_PREVIEW_CHROME}</style>
</head>
<body bgcolor="${pageBg}" class="email-body" style="--email-page:${pageBg};font-family:${fontStack(globals)}">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${pageBg}" class="email-bg">
    <tr>
      <td align="center" bgcolor="${pageBg}" class="email-bg email-outer-pad">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${EMAIL_CONTENT_WIDTH_PX}" class="email-container">
          ${ctx(labels.before)}
          ${framed}
          ${ctx(labels.after)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
