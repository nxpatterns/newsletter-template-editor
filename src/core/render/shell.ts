import type { Globals, LogoConfig } from '../types';
import { emailDocumentCss } from './email-css';
import { attrHref, escapeAttr, escapeHtml, fontStack, resolveHref, type RenderMode } from './utils';

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

export function renderHeader(globals: Globals, mode: RenderMode, bodyInner: string): string {
  const messageHref = mode === 'export' ? '{{ MessageURL }}' : '#';
  const logoHtml = renderLogo(globals.logo);
  const pageBg = escapeAttr(globals.pageBgColor);
  const contentBg = escapeAttr(globals.contentBgColor);
  const starsText = escapeHtml(globals.brand?.starsText || '');
  const starsRow = starsText
    ? `<p class="brand-stars text-accent" data-field="brand.starsText">${starsText}</p>`
    : '';
  const brandName = globals.brand?.nameHtml || '';
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

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${pageBg}" class="email-bg">
      <tr>
        <td align="center" bgcolor="${pageBg}" class="email-bg email-outer-pad">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container">
            <tr>
              <td bgcolor="${contentBg}" class="mobile-padding header-bg">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td valign="top" class="v-top">
                      ${starsRow}
                      <span data-field="brand.nameHtml">${brandName}</span>
                    </td>
                    <td align="right" valign="top" class="t-right">
                      ${logoHtml}
                      <p class="${viewInBrowserClass}">
                        <a href="${messageHref}" target="_blank" class="email-muted-link">${escapeHtml(
                          legal.viewInBrowserLabel,
                        )}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${bodyInner}
            <tr>
              <td bgcolor="${pageBg}" class="mobile-padding footer-bg footer-notice-pad">
                <p class="footer-notice text-dim" data-field="legal.noticeHtml">
                  ${legal.noticeHtml}
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="${pageBg}" class="mobile-padding footer-bg footer-meta-pad">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td class="footer-rule-cell">&nbsp;</td></tr>
                </table>
                <p class="footer-stars-line">
                  <span class="footer-stars-glyph text-accent">${starsText || '★ ★ ★ ★ ★ ★'}</span>
                </p>
                <p class="footer-company text-dim" data-field="legal.companyName">
                  ${companyRow}
                </p>
                <p class="footer-links">
                  <a href="${privacyHref}" target="_blank" class="email-footer-link">${escapeHtml(
                    legal.privacyLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${imprintHref}" target="_blank" class="email-footer-link">${escapeHtml(
                    legal.imprintLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${unsubHref}" target="_blank" class="email-footer-link">${escapeHtml(
                    legal.unsubscribeLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${messageHref}" target="_blank" class="email-footer-link">${escapeHtml(
                    legal.viewInBrowserLabel,
                  )}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderExportShell(globals: Globals, bodyInner: string): string {
  const font = fontStack(globals);
  const preheader = escapeHtml(globals.preheader || '');
  const header = renderHeader(globals, 'export', bodyInner);
  const pageBg = escapeAttr(globals.pageBgColor);
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>{{ .Campaign.Subject }}</title>
  <style>${emailDocumentCss(globals)}</style>
</head>
<body bgcolor="${pageBg}" class="email-body" style="--email-page-bg:${pageBg};font-family:${font}">
  <div class="preheader-hide">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
  ${header}
  {{ TrackView }}
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

export function renderPreviewDoc(globals: Globals, bodyInner: string, subject: string): string {
  const font = fontStack(globals);
  const preheader = escapeHtml(globals.preheader || '');
  const header = renderHeader(globals, 'preview', bodyInner);
  const pageBg = escapeAttr(globals.pageBgColor);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(subject || 'Preview')}</title>
  <style>${emailDocumentCss(globals)}${PREVIEW_EDITOR_CHROME}</style>
</head>
<body bgcolor="${pageBg}" class="email-body" style="--email-page-bg:${pageBg};font-family:${font}">
  <div class="preheader-hide">${preheader}</div>
  ${header}
</body>
</html>`;
}
