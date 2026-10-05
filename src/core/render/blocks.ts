import type {
  Block,
  CtaButtonBlock,
  DividerBlock,
  Globals,
  HeroBlock,
  ParagraphBlock,
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
  const attrs = ctx.annotate ? ` data-block-id="${escapeAttr(block.id)}" data-block-type="${escapeAttr(block.type)}"` : '';
  return `<tr${attrs}>${innerTdHtml}</tr>`;
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
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function renderBlocks(blocks: Block[], ctx: RenderContext): string {
  return blocks.map((b) => renderBlock(b, ctx)).join('\n');
}
