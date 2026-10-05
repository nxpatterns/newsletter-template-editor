import type { Globals, LogoConfig } from '../types';
import { attrHref, escapeAttr, escapeHtml, fontStack, resolveHref, type RenderMode } from './utils';

export function darkModeCss(globals: Globals): string {
  const pageBg = globals.pageBgColor;
  const contentBg = globals.contentBgColor;
  return `
  :root { color-scheme: light dark; }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  table { border-collapse:collapse !important; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${pageBg} !important; }
  @media (prefers-color-scheme: dark) {
    body, .email-bg, .footer-bg { background-color:${pageBg} !important; }
    .header-bg, .content-bg { background-color:${contentBg} !important; }
    .text-body { color:${globals.bodyTextColor} !important; }
    .text-heading { color:${globals.headingColor} !important; }
    .text-accent { color:${globals.accentColor} !important; }
    .text-gold { color:${globals.goldColor} !important; }
    .text-dim { color:#4a6a88 !important; }
  }
  @media screen and (max-width: 600px) {
    .email-container { width:100% !important; }
    .mobile-padding { padding:28px 20px !important; }
    .mobile-font-large { font-size:26px !important; line-height:36px !important; }
  }
  `;
}

function renderLogo(logo: LogoConfig | undefined): string {
  if (!logo || !logo.src) return '';
  const h = Math.max(16, Math.round(logo.heightPx || 48));
  const alt = escapeAttr(logo.alt || '');
  const widthAttr = logo.widthPx ? ` width="${Math.round(logo.widthPx)}"` : '';
  const imgTag = `<img src="${escapeAttr(logo.src)}" alt="${alt}" height="${h}"${widthAttr} style="display:inline-block;height:${h}px;${
    logo.widthPx ? `width:${Math.round(logo.widthPx)}px;` : 'max-width:180px;width:auto;'
  }border:0;vertical-align:top">`;
  if (logo.href) {
    return `<a href="${escapeAttr(logo.href)}" target="_blank" style="display:inline-block;border:0">${imgTag}</a>`;
  }
  return imgTag;
}

export function renderHeader(globals: Globals, mode: RenderMode, bodyInner: string): string {
  const font = fontStack(globals);
  const messageHref = mode === 'export' ? '{{ MessageURL }}' : '#';
  const logoHtml = renderLogo(globals.logo);
  const pageBg = escapeAttr(globals.pageBgColor);
  const contentBg = escapeAttr(globals.contentBgColor);
  const gold = escapeAttr(globals.goldColor);
  const starsText = escapeHtml(globals.brand?.starsText || '');
  const starsRow = starsText
    ? `<p style="font-family:${font};font-size:11px;color:${gold};letter-spacing:5px;margin:0 0 10px 0;line-height:1" class="text-gold" data-field="brand.starsText">${starsText}</p>`
    : '';
  const brandName = globals.brand?.nameHtml || '';
  const legal = globals.legal;
  const unsubHref = mode === 'export' ? '{{ UnsubscribeURL }}' : '#';
  const privacyHref = attrHref(resolveHref(legal.privacyHref, mode), mode);
  const imprintHref = attrHref(resolveHref(legal.imprintHref, mode), mode);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${pageBg}" class="email-bg" style="background-color:${pageBg}">
      <tr>
        <td align="center" bgcolor="${pageBg}" class="email-bg" style="padding:28px 16px;background-color:${pageBg}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width:600px">
            <tr>
              <td bgcolor="${contentBg}" style="background-color:${contentBg};padding:32px 48px 28px 48px" class="mobile-padding header-bg">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td valign="top" style="vertical-align:top">
                      ${starsRow}
                      <span data-field="brand.nameHtml">${brandName}</span>
                    </td>
                    <td align="right" valign="top" style="vertical-align:top;text-align:right">
                      ${logoHtml}
                      <p style="font-family:${font};font-size:10px;color:#1e3a5c;letter-spacing:2px;text-transform:uppercase;margin:${
                        logoHtml ? '8px' : '0'
                      } 0 0 0;line-height:18px">
                        <a href="${messageHref}" target="_blank" style="color:#1e3a5c;text-decoration:none">${escapeHtml(
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
              <td bgcolor="${pageBg}" style="background-color:${pageBg};padding:28px 48px" class="mobile-padding footer-bg">
                <p style="font-family:'Trebuchet MS',Tahoma,Verdana,Arial;font-size:14px;line-height:20px;color:#4a6a88;margin:0;letter-spacing:2px" class="text-dim" data-field="legal.noticeHtml">
                  ${legal.noticeHtml}
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="${pageBg}" style="background-color:${pageBg};padding:0 48px 36px 48px" class="mobile-padding footer-bg">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:1px;background-color:#0c1a2e;font-size:0;line-height:0">&nbsp;</td></tr>
                </table>
                <p style="font-family:${font};font-size:11px;color:#1a3050;margin:18px 0 0 0;text-align:center;letter-spacing:3px">
                  <span style="color:${gold};font-size:9px" class="text-gold">${starsText || '★ ★ ★ ★ ★ ★'}</span>
                </p>
                <p style="font-family:${font};font-size:12px;color:#4a6a88;margin:10px 0 0 0;text-align:center" class="text-dim" data-field="legal.companyLine">
                  ${escapeHtml(legal.companyLine)}
                </p>
                <p style="font-family:${font};font-size:12px;margin:8px 0 0 0;text-align:center">
                  <a href="${privacyHref}" target="_blank" style="color:#4a6a88;text-decoration:underline">${escapeHtml(
                    legal.privacyLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${imprintHref}" target="_blank" style="color:#4a6a88;text-decoration:underline">${escapeHtml(
                    legal.imprintLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${unsubHref}" target="_blank" style="color:#4a6a88;text-decoration:underline">${escapeHtml(
                    legal.unsubscribeLabel,
                  )}</a>
                  &nbsp;|&nbsp;
                  <a href="${messageHref}" target="_blank" style="color:#4a6a88;text-decoration:underline">${escapeHtml(
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
  <style>${darkModeCss(globals)}</style>
</head>
<body bgcolor="${pageBg}" style="margin:0;padding:0;background-color:${pageBg};font-family:${font}">
  <div style="display:none;color:${pageBg};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden">
    ${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>
  ${header}
  {{ TrackView }}
</body>
</html>`;
}

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
  <style>${darkModeCss(globals)}</style>
</head>
<body bgcolor="${pageBg}" style="margin:0;padding:0;background-color:${pageBg};font-family:${font}">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  ${header}
</body>
</html>`;
}
