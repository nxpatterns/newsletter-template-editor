import type {
  BenefitsListBlock,
  Block,
  ChapterBandBlock,
  CtaButtonBlock,
  CtaLinkListBlock,
  DividerBlock,
  Globals,
  HeroBlock,
  ParagraphBlock,
  PriceBoxBlock,
  PullQuoteBlock,
  StatBoxBlock,
} from '../types';
import {
  attrHref,
  escapeAttr,
  escapeHtml,
  fontStack,
  resolveHref,
  type RenderMode,
} from './utils';

export interface RenderContext {
  globals: Globals;
  mode: RenderMode;
  annotate?: boolean;
}

function contentBg(ctx: RenderContext): string {
  return escapeAttr(ctx.globals.contentBgColor);
}

function rowWrap(block: Block, ctx: RenderContext, innerTdHtml: string): string {
  if (!ctx.annotate) return `<tr>${innerTdHtml}</tr>`;
  return `<tr class="nte-block" data-block-id="${escapeAttr(block.id)}" data-block-type="${escapeAttr(block.type)}">${innerTdHtml}</tr>`;
}

function renderDivider(b: DividerBlock, ctx: RenderContext): string {
  const bg = contentBg(ctx);
  let inner = '';
  if (b.style === 'thin') {
    inner = `
      <td style="background-color:${bg};padding:0 48px" class="content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="height:1px;background-color:#1a3050;font-size:0;line-height:0">&nbsp;</td></tr>
        </table>
      </td>
    `;
  } else if (b.style === 'accent-double') {
    inner = `
      <td style="background-color:${bg};padding:0 48px" class="content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height:3px;background-color:${bg};font-size:0;line-height:0">&nbsp;</td>
            <td style="width:80px;height:3px;background-color:#1e6bb8;font-size:0;line-height:0" width="80">&nbsp;</td>
            <td style="width:120px;height:3px;background-color:${escapeAttr(ctx.globals.accentColor)};font-size:0;line-height:0" width="120">&nbsp;</td>
          </tr>
        </table>
      </td>
    `;
  } else {
    const h = Math.max(1, b.heightPx ?? 24);
    inner = `
      <td style="background-color:${bg};padding:0;height:${h}px;font-size:0;line-height:0" class="content-bg" height="${h}">&nbsp;</td>
    `;
  }
  return rowWrap(b, ctx, inner);
}

function renderHero(b: HeroBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:52px 48px 48px 48px" class="mobile-padding content-bg">
        <p style="font-family:${font};font-size:14px;color:${escapeAttr(ctx.globals.goldColor)};letter-spacing:2px;margin:0 0 28px 0" class="text-gold">
          <span data-field="label">${escapeHtml(b.label)}</span>
        </p>
        <h1 class="mobile-font-large text-heading" style="font-family:${font};color:${escapeAttr(ctx.globals.headingColor)};margin:0;font-weight:400">
          <span data-field="headlineHtml" style="font-size:26px">${b.headlineHtml}</span>
        </h1>
      </td>
    `,
  );
}

function renderParagraph(b: ParagraphBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:24px 48px" class="mobile-padding content-bg">
        <p style="font-family:${font};font-size:17px;line-height:30px;color:${escapeAttr(ctx.globals.bodyTextColor)};margin:0" class="text-body">
          <span data-field="html">${b.html}</span>
        </p>
      </td>
    `,
  );
}

function renderCtaButton(b: CtaButtonBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const href = resolveHref(b.href, ctx.mode);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:24px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color:#1d6bb8">
              <a href="${attrHref(href, ctx.mode)}" target="_blank" style="display:inline-block;padding:18px 48px;font-family:${font};font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;text-transform:uppercase">
                <span data-field="text">${escapeHtml(b.text)}</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    `,
  );
}

function renderChapterBand(b: ChapterBandBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  return rowWrap(
    b,
    ctx,
    `
      <td bgcolor="#060e1a" style="background-color:#060e1a;padding:16px 48px" class="mobile-padding chapter-bg">
        <p style="font-family:${font};font-size:14px;color:${escapeAttr(ctx.globals.goldColor)};letter-spacing:2px;margin:0" class="text-gold text-chapter-label">
          <span data-field="titleHtml">${b.titleHtml}</span>
        </p>
      </td>
    `,
  );
}

function renderPullQuote(b: PullQuoteBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const accent = escapeAttr(ctx.globals.accentColor);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:20px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width:3px;background-color:${accent}" width="3">&nbsp;</td>
            <td style="padding:16px 0 16px 22px">
              <p class="pull-quote" style="font-family:${font};font-size:22px;line-height:34px;color:#c8dff0;margin:0;font-style:italic">
                <span data-field="html">${b.html}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    `,
  );
}

function renderStatBox(b: StatBoxBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const accent = escapeAttr(ctx.globals.accentColor);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:20px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td bgcolor="#060e1a" style="background-color:#060e1a;padding:28px 32px" class="chapter-bg stat-box-bg">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:top;width:50%" width="50%">
                    <p style="font-family:${font};font-size:42px;color:${accent};margin:0 0 4px 0;font-weight:400;line-height:1" class="text-stat">
                      <span data-field="number">${escapeHtml(b.number)}</span>
                    </p>
                    <p style="font-family:${font};font-size:13px;color:#3e84c6;margin:0;text-transform:uppercase;letter-spacing:2px" class="text-geo">
                      <span data-field="label">${escapeHtml(b.label)}</span>
                    </p>
                  </td>
                  <td style="vertical-align:top;padding-left:24px;border-left:1px solid #0e1e34">
                    <p style="font-family:${font};font-size:13px;color:${escapeAttr(ctx.globals.bodyTextColor)};margin:0 0 6px 0;line-height:22px" class="text-geo">
                      <span data-field="geoHtml">${b.geoHtml}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    `,
  );
}

function renderBenefitsList(b: BenefitsListBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const rows = b.items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #0a1828">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width:18px;vertical-align:top;padding-top:3px">
                  <span style="color:#4db8ff;font-size:14px;font-family:Helvetica,Arial,sans-serif">›</span>
                </td>
                <td style="font-family:${font};font-size:16px;color:#b9f2ff">
                  <span data-field="items" data-item-index="${index}">${escapeHtml(item)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
    )
    .join('');
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:20px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          ${rows}
        </table>
      </td>
    `,
  );
}

function renderPriceBox(b: PriceBoxBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const gold = escapeAttr(ctx.globals.goldColor);
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:20px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td bgcolor="#060d1a" style="background-color:#060d1a;border:1px solid #111d33;border-top:3px solid ${gold};padding:24px 28px" class="chapter-bg price-box-bg">
              <p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#060d1a;background-color:${gold};display:inline;padding:3px 10px;text-transform:uppercase;margin:0 0 14px 0">
                <span data-field="badge">${escapeHtml(b.badge)}</span>
              </p>
              <br /><br />
              <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#02fdfb;margin:0 0 4px 0;text-decoration:line-through" class="text-price-strike">
                <span data-field="strike">${escapeHtml(b.strike)}</span>
              </p>
              <p style="font-family:Helvetica,Arial,sans-serif;font-size:38px;font-weight:700;color:#ffffff;margin:0 0 6px 0;line-height:1.1" class="text-price-main">
                <span data-field="mainPriceHtml">${b.mainPriceHtml}</span>
              </p>
              <p style="font-family:${font};font-size:14px;color:#72bde9;margin:0 0 10px 0;line-height:22px" class="text-price-detail">
                <span data-field="details">${escapeHtml(b.details)}</span>
              </p>
              <p style="font-family:${font};font-size:13px;color:#2c4d66;margin:0;line-height:20px;font-style:italic" class="text-price-fine">
                <span data-field="fine">${escapeHtml(b.fine)}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    `,
  );
}

function renderCtaLinkList(b: CtaLinkListBlock, ctx: RenderContext): string {
  const font = fontStack(ctx.globals);
  const accent = escapeAttr(ctx.globals.accentColor);
  const rows = b.items
    .map((item, index) => {
      const href = item.href ? resolveHref(item.href, ctx.mode) : '';
      const link =
        item.linkText && href
          ? `<a href="${attrHref(href, ctx.mode)}" target="_blank" style="color:${accent};text-decoration:underline"><span data-field="items" data-item-index="${index}" data-item-key="linkText">${escapeHtml(item.linkText)}</span></a>`
          : '';
      const border = index === b.items.length - 1 ? '' : 'border-bottom:1px solid #0a1828';
      const pad = index === 0 ? 'padding:0 0 14px 0' : index === b.items.length - 1 ? 'padding:14px 0 0 0' : 'padding:14px 0';
      return `
        <tr>
          <td style="${pad};${border}">
            <p style="font-family:${font};font-size:14px;line-height:24px;color:#3a6080;margin:0" class="text-cta-body">
              <span style="color:${accent};margin-right:8px">→</span>
              <strong style="color:#5a8aaa"><span data-field="items" data-item-index="${index}" data-item-key="label">${escapeHtml(item.label)}</span></strong>
              <span data-field="items" data-item-index="${index}" data-item-key="intro"> ${escapeHtml(item.intro)} </span>
              ${link}
            </p>
          </td>
        </tr>
      `;
    })
    .join('');
  return rowWrap(
    b,
    ctx,
    `
      <td style="background-color:${contentBg(ctx)};padding:20px 48px" class="mobile-padding content-bg">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          ${rows}
        </table>
      </td>
    `,
  );
}

export function renderBlock(block: Block, ctx: RenderContext): string {
  switch (block.type) {
    case 'divider':
      return renderDivider(block, ctx);
    case 'hero':
      return renderHero(block, ctx);
    case 'paragraph':
      return renderParagraph(block, ctx);
    case 'cta-button':
      return renderCtaButton(block, ctx);
    case 'chapter-band':
      return renderChapterBand(block, ctx);
    case 'pull-quote':
      return renderPullQuote(block, ctx);
    case 'stat-box':
      return renderStatBox(block, ctx);
    case 'benefits-list':
      return renderBenefitsList(block, ctx);
    case 'price-box':
      return renderPriceBox(block, ctx);
    case 'cta-link-list':
      return renderCtaLinkList(block, ctx);
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function renderBlocks(blocks: Block[], ctx: RenderContext): string {
  return blocks.map((b) => renderBlock(b, ctx)).join('\n');
}
