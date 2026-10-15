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
import { richDocToHtml } from '../richtext/to-html';
import {
  attrHref,
  escapeAttr,
  escapeHtml,
  mixHex,
  plainTextToHtml,
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

/** Dual-write bgcolor + class-driven background (email client exception). */
function contentTd(ctx: RenderContext, extraClass: string, inner: string): string {
  const bg = contentBg(ctx);
  return `<td bgcolor="${bg}" class="mobile-padding content-bg ${extraClass}">${inner}</td>`;
}

function rowWrap(block: Block, ctx: RenderContext, innerTdHtml: string): string {
  if (!ctx.annotate) return `<tr>${innerTdHtml}</tr>`;
  return `<tr class="nte-block" data-block-id="${escapeAttr(block.id)}" data-block-type="${escapeAttr(block.type)}">${innerTdHtml}</tr>`;
}

/** Glow line: [share of Secondary, cell width %], brightest in the middle. */
const GLOW_STEPS: readonly (readonly [number, number])[] = [
  [0.06, 13],
  [0.16, 13],
  [0.36, 14],
  [1, 20],
  [0.36, 14],
  [0.16, 13],
  [0.06, 13],
];

function renderDivider(b: DividerBlock, ctx: RenderContext): string {
  const page = b.background === 'page';
  const bgHex = page ? ctx.globals.pageBgColor : ctx.globals.contentBgColor;
  const bg = escapeAttr(bgHex);
  const bgClass = page ? 'email-bg' : 'content-bg';
  let inner = '';
  if (b.style === 'thin') {
    inner = `
      <td bgcolor="${bg}" class="${bgClass} divider-row">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td class="divider-line">&nbsp;</td></tr>
        </table>
      </td>
    `;
  } else if (b.style === 'two-tone') {
    inner = `
      <td bgcolor="${bg}" class="${bgClass} divider-row">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="divider-two-tone-gap">&nbsp;</td>
            <td class="divider-two-tone-mid" width="80">&nbsp;</td>
            <td class="divider-two-tone-end" width="120">&nbsp;</td>
          </tr>
        </table>
      </td>
    `;
  } else if (b.style === 'ornament') {
    const rule = escapeAttr(mixHex(ctx.globals.secondaryColor, bgHex, 0.25));
    const hair = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td class="divider-hair" bgcolor="${rule}" style="background-color:${rule}">&nbsp;</td></tr></table>`;
    inner = `
      <td bgcolor="${bg}" class="${bgClass} divider-row-spaced">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="divider-ornament-side" valign="middle">${hair}</td>
            <td class="divider-ornament-glyph" width="40" align="center">&#9670;</td>
            <td class="divider-ornament-side" valign="middle">${hair}</td>
          </tr>
        </table>
      </td>
    `;
  } else if (b.style === 'glow') {
    const steps = GLOW_STEPS.map(([share, width]) => {
      const c = escapeAttr(mixHex(ctx.globals.secondaryColor, bgHex, share));
      return `<td class="divider-glow-step" width="${width}%" bgcolor="${c}" style="background-color:${c}">&nbsp;</td>`;
    }).join('');
    inner = `
      <td bgcolor="${bg}" class="${bgClass} divider-row-spaced">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>${steps}</tr>
        </table>
      </td>
    `;
  } else {
    const h = Math.max(1, b.heightPx ?? 24);
    inner = `
      <td bgcolor="${bg}" class="${bgClass} divider-spacer" height="${h}" style="--divider-h:${h}px">&nbsp;</td>
    `;
  }
  return rowWrap(b, ctx, inner);
}

function renderHero(b: HeroBlock, ctx: RenderContext): string {
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-hero',
      `
        <p class="hero-label text-accent">
          <span data-field="label">${escapeHtml(b.label)}</span>
        </p>
        <h1 class="mobile-font-large text-primary hero-headline">
          <span data-field="headline" class="hero-headline-inner">${plainTextToHtml(b.headline)}</span>
        </h1>
      `,
    ),
  );
}

function renderParagraph(b: ParagraphBlock, ctx: RenderContext): string {
  const inner = richDocToHtml(b.body, { dataField: 'body' });
  return rowWrap(b, ctx, contentTd(ctx, 'block-pad-md paragraph-block', inner));
}

function renderCtaButton(b: CtaButtonBlock, ctx: RenderContext): string {
  const href = resolveHref(b.href, ctx.mode);
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-md',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td class="cta-button-cell" bgcolor="#1d6bb8">
              <a href="${attrHref(href, ctx.mode)}" target="_blank" class="cta-button-link">
                <span data-field="text">${escapeHtml(b.text)}</span>
              </a>
            </td>
          </tr>
        </table>
      `,
    ),
  );
}

function renderChapterBand(b: ChapterBandBlock, ctx: RenderContext): string {
  return rowWrap(
    b,
    ctx,
    `
      <td bgcolor="#060e1a" class="mobile-padding chapter-bg block-pad-chapter">
        <p class="chapter-title text-accent text-chapter-label">
          <span data-field="title">${plainTextToHtml(b.title)}</span>
        </p>
      </td>
    `,
  );
}

function renderPullQuote(b: PullQuoteBlock, ctx: RenderContext): string {
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-sm',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="pull-quote-bar" width="3">&nbsp;</td>
            <td class="pull-quote-body-cell">
              <p class="pull-quote">
                <span data-field="quote">${plainTextToHtml(b.quote)}</span>
              </p>
            </td>
          </tr>
        </table>
      `,
    ),
  );
}

function renderStatBox(b: StatBoxBlock, ctx: RenderContext): string {
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-sm',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td bgcolor="#060e1a" class="chapter-bg stat-box-bg stat-box-inner">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="stat-col-num" width="50%">
                    <p class="stat-number text-stat">
                      <span data-field="number">${escapeHtml(b.number)}</span>
                    </p>
                    <p class="stat-label">
                      <span data-field="label">${escapeHtml(b.label)}</span>
                    </p>
                  </td>
                  <td class="stat-col-geo">
                    <p class="stat-geo text-geo">
                      <span data-field="geo">${plainTextToHtml(b.geo)}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    ),
  );
}

function renderBenefitsList(b: BenefitsListBlock, ctx: RenderContext): string {
  const rows = b.items
    .map((item, index) => {
      const icon = item.icon?.trim() || '›';
      return `
        <tr class="benefit-row">
          <td class="benefit-row-cell">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td class="benefit-icon-cell">
                  <span
                    class="benefit-icon text-benefit-icon"
                    data-field="items"
                    data-item-index="${index}"
                    data-item-key="icon"
                  >${escapeHtml(icon)}</span>
                </td>
                <td class="benefit-text-cell">
                  <span
                    class="benefit-text text-benefit"
                    data-field="items"
                    data-item-index="${index}"
                    data-item-key="text"
                  >${escapeHtml(item.text)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'benefits-list-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="benefits-list-table">
          ${rows}
        </table>
      `,
    ),
  );
}

function composeStrikeLine(b: PriceBoxBlock): string {
  if (!b.strikeEnabled) return '';
  const money = `${b.currency}${b.strikeAmount}`.trim();
  return [b.strikeLabel.trim(), money].filter(Boolean).join(' ');
}

function renderPriceBox(b: PriceBoxBlock, ctx: RenderContext): string {
  const strikeLine = composeStrikeLine(b);
  const strikeHtml = strikeLine
    ? `
              <p class="price-strike text-price-strike">
                <span data-field="strikeLabel">${escapeHtml(b.strikeLabel)}</span>${
                  b.strikeLabel.trim() ? ' ' : ''
                }<s class="price-strike-amount"><span data-field="currency">${escapeHtml(b.currency)}</span><span data-field="strikeAmount">${escapeHtml(
                  b.strikeAmount,
                )}</span></s>
              </p>`
    : '';
  const periodHtml = b.periodLabel.trim()
    ? ` <span data-field="periodLabel" class="price-period text-price-sub">${escapeHtml(b.periodLabel)}</span>`
    : '';
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'price-box-outer',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td bgcolor="#060d1a" class="chapter-bg price-box-bg price-box-inner">
              <p class="price-badge">
                <span data-field="badge">${escapeHtml(b.badge)}</span>
              </p>
              <br /><br />${strikeHtml}
              <p class="price-main text-price-main">
                <span data-field="currency" class="price-currency">${escapeHtml(b.currency)}</span><span data-field="amount">${escapeHtml(
                  b.amount,
                )}</span>${periodHtml}
              </p>
              <p class="price-details text-price-detail">
                <span data-field="details">${escapeHtml(b.details)}</span>
              </p>
              <p class="price-fine text-price-fine">
                <span data-field="fine">${escapeHtml(b.fine)}</span>
              </p>
            </td>
          </tr>
        </table>
      `,
    ),
  );
}

function ctaRowCellClass(index: number, total: number): string {
  if (total <= 1) return 'cta-link-row-cell cta-link-row-cell--only';
  if (index === 0) return 'cta-link-row-cell cta-link-row-cell--first';
  if (index === total - 1) return 'cta-link-row-cell cta-link-row-cell--last';
  return 'cta-link-row-cell';
}

function renderCtaLinkList(b: CtaLinkListBlock, ctx: RenderContext): string {
  const total = b.items.length;
  const rows = b.items
    .map((item, index) => {
      const href = item.href ? resolveHref(item.href, ctx.mode) : '';
      const link =
        item.linkText && href
          ? `<a href="${attrHref(href, ctx.mode)}" target="_blank" class="cta-link-anchor"><span data-field="items" data-item-index="${index}" data-item-key="linkText">${escapeHtml(item.linkText)}</span></a>`
          : '';
      return `
        <tr class="cta-link-row">
          <td class="${ctaRowCellClass(index, total)}">
            <p class="cta-link-body text-cta-body">
              <span data-field="items" data-item-index="${index}" data-item-key="icon" class="cta-link-icon">${escapeHtml(item.icon || '→')}</span>
              <strong class="cta-link-label"><span data-field="items" data-item-index="${index}" data-item-key="label">${escapeHtml(item.label)}</span></strong>
              <span data-field="items" data-item-index="${index}" data-item-key="intro">${item.intro ? ` ${escapeHtml(item.intro)} ` : ' '}</span>
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
    contentTd(
      ctx,
      'cta-links-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="cta-links-table">
          ${rows}
        </table>
      `,
    ),
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
