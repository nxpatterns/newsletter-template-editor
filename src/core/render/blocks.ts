import type {
  BenefitsListBlock,
  Block,
  ChapterBandBlock,
  ContactBlock,
  CtaButtonBlock,
  CtaLinkListBlock,
  DividerBlock,
  Globals,
  GreetingBlock,
  HeroBlock,
  ImageBlock,
  ImageTextBlock,
  ParagraphBlock,
  PriceBoxBlock,
  PullQuoteBlock,
  TestimonialBlock,
  StatBoxBlock,
  TeasersBlock,
  EventBlock,
  VideoBlock,
} from '../types';
import { eventPlace, eventSheet, eventTimeRange, googleCalendarHref } from './event';
import { buildLinkHref } from '../richtext/link-target';
import { richDocToHtml } from '../richtext/to-html';
import {
  attrHref,
  escapeAttr,
  escapeHtml,
  mixHex,
  plainTextToHtml,
  EMAIL_CONTENT_WIDTH_PX,
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

/** Image display width per choice; text width = content column minus the 48px side pads. */
const IMAGE_PX: Record<ImageBlock['width'], number> = { full: EMAIL_CONTENT_WIDTH_PX, text: 504, small: 252 };

function renderImage(b: ImageBlock, ctx: RenderContext): string {
  const src = b.src.trim();
  // Nothing to send without a picture; the editor preview still needs a selectable row.
  if (!src && !ctx.annotate) return '';
  const w = IMAGE_PX[b.width] ?? IMAGE_PX.text;
  const padClass = b.width === 'full' ? 'image-cell-full' : 'mobile-padding image-cell';
  const caption = b.caption.trim()
    ? `<p class="image-caption${b.width === 'full' ? ' image-caption-full' : ''}" data-field="caption">${plainTextToHtml(b.caption)}</p>`
    : '';
  let pic = src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" width="${w}" class="email-image" style="--image-w:${w}px">`
    : `<span class="nte-image-empty" style="--image-w:${w}px">&nbsp;</span>`;
  const href = b.href.trim() ? resolveHref(b.href, ctx.mode) : '';
  if (src && href) pic = `<a href="${attrHref(href, ctx.mode)}" target="_blank" class="email-image-link">${pic}</a>`;
  return rowWrap(
    b,
    ctx,
    `<td bgcolor="${contentBg(ctx)}" class="content-bg ${padClass}" align="center">${pic}${caption}</td>`,
  );
}

/** Image column width: the 504px text column minus a 20px gutter, split ⅓ or ½. */
const IMAGE_TEXT_PX: Record<ImageTextBlock['imageWidth'], number> = { third: 160, half: 242 };

/**
 * Two columns that stack on phones. For an image on the right the table runs
 * dir="rtl", so the image still comes first in the source and lands on top when stacked.
 */
function renderImageText(b: ImageTextBlock, ctx: RenderContext): string {
  const src = b.src.trim();
  const text = richDocToHtml(b.body, { dataField: 'body' });
  // Export without a picture keeps the copy as a plain paragraph.
  if (!src && !ctx.annotate) return rowWrap(b, ctx, contentTd(ctx, 'block-pad-md paragraph-block', text));
  const w = IMAGE_TEXT_PX[b.imageWidth] ?? IMAGE_TEXT_PX.third;
  let pic = src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" width="${w}" class="email-image image-text-img" style="--image-w:${w}px">`
    : `<span class="nte-image-empty" style="--image-w:${w}px">&nbsp;</span>`;
  const href = b.href.trim() ? resolveHref(b.href, ctx.mode) : '';
  if (src && href) pic = `<a href="${attrHref(href, ctx.mode)}" target="_blank" class="email-image-link">${pic}</a>`;
  const rtl = b.side === 'right';
  const tableDir = rtl ? ' dir="rtl"' : '';
  const cellDir = rtl ? ' dir="ltr"' : '';
  const valign = b.valign === 'middle' ? 'middle' : 'top';
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-md image-text-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"${tableDir}>
          <tr>
            <td class="image-text-col image-text-pic" width="${w}" valign="top"${cellDir}>${pic}</td>
            <td class="image-text-gap" width="20">&nbsp;</td>
            <td class="image-text-col image-text-copy" valign="${valign}"${cellDir}>${text}</td>
          </tr>
        </table>
      `,
    ),
  );
}

/**
 * Mailbox names that are no person ("info@x.eu"). Listmonk turns a missing name into the
 * part before the @, so such a name counts as unknown. Real names that match their address
 * ("Thomas Schmidt" for thomas.schmidt@…) stay.
 */
export const GREETING_ROLE_NAMES: readonly string[] = [
  'info', 'office', 'kontakt', 'contact', 'mail', 'email', 'post', 'service', 'support',
  'sales', 'vertrieb', 'verkauf', 'buchhaltung', 'rechnung', 'invoice', 'team', 'hallo',
  'hello', 'admin', 'empfang', 'rezeption', 'reception', 'reservierung', 'booking', 'buero',
  'büro', 'marketing', 'newsletter', 'zentrale', 'noreply', 'no reply',
];

/** Uses Sprig functions shipped with Listmonk templates. */
function greetingNameTemplate(lead: string, fallback: string): string {
  const roles = GREETING_ROLE_NAMES.map((r) => `"${r}"`).join(' ');
  return (
    '{{- $n := trim .Subscriber.Name -}}' +
    `{{- if and $n (not (contains "@" $n)) (not (has (lower $n) (list ${roles}))) -}}` +
    `${lead} {{ $n }}{{- else -}}${fallback}{{- end -}}`
  );
}

function renderGreeting(b: GreetingBlock, ctx: RenderContext): string {
  const fallback = escapeHtml(b.text);
  const lead = escapeHtml(b.nameLead.trim());
  let line = fallback;
  if (b.useName) {
    if (ctx.mode === 'export') {
      line = greetingNameTemplate(lead, fallback);
    } else {
      // Preview: the sample name from Campaign settings; empty sample shows the fallback.
      const sample = (ctx.globals.personalization?.samples['name'] ?? '').trim();
      if (sample) line = `${lead} ${escapeHtml(sample)}`;
    }
  }
  return rowWrap(
    b,
    ctx,
    contentTd(ctx, 'block-pad-md paragraph-block', `<p class="paragraph-body greeting-line${b.size === 'm' ? '' : ` rt-size-${b.size}`} text-${b.color}" data-field="text">${line}</p>`),
  );
}

/** Contact person: round photo left (stacks above on phones), details right, optional button. */
function renderContact(b: ContactBlock, ctx: RenderContext): string {
  const src = b.src.trim();
  const line = (cls: string, field: string, text: string) =>
    text.trim() ? `<p class="${cls}" data-field="${field}">${escapeHtml(text)}</p>` : '';
  const link = (field: string, text: string, href: string | null) =>
    text.trim()
      ? `<p class="contact-line" data-field="${field}">${
          href ? `<a href="${escapeAttr(href)}" class="contact-link">${escapeHtml(text)}</a>` : escapeHtml(text)
        }</p>`
      : '';
  const btnHref = b.href.trim() ? resolveHref(b.href, ctx.mode) : '';
  const button =
    b.buttonLabel.trim() && btnHref
      ? `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="contact-button">
              <tr>
                <td class="cta-button-cell" bgcolor="#1d6bb8">
                  <a href="${attrHref(btnHref, ctx.mode)}" target="_blank" class="cta-button-link contact-button-link"><span data-field="buttonLabel">${escapeHtml(b.buttonLabel)}</span></a>
                </td>
              </tr>
            </table>`
      : '';
  const photo = src
    ? `<td class="contact-col contact-photo-cell" width="92" valign="middle"><img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" width="72" height="72" class="contact-photo"></td>`
    : '';
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-md contact-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="contact-table">
          <tr>
            ${photo}
            <td class="contact-col contact-info" valign="middle">
              ${line('contact-intro', 'intro', b.intro)}
              ${line('contact-name', 'name', b.name)}
              ${line('contact-role', 'role', b.role)}
              ${link('phone', b.phone, buildLinkHref('phone', b.phone))}
              ${link('email', b.email, buildLinkHref('email', b.email))}
              ${button}
            </td>
          </tr>
        </table>
      `,
    ),
  );
}

/** Video preview: linked thumbnail, then a play row (round play cell, title link, duration). */
function renderVideo(b: VideoBlock, ctx: RenderContext): string {
  const src = b.src.trim();
  const href = b.href.trim() ? resolveHref(b.href, ctx.mode) : '';
  const wrap = (inner: string, cls: string) =>
    href ? `<a href="${attrHref(href, ctx.mode)}" target="_blank" class="${cls}">${inner}</a>` : inner;
  const w = IMAGE_PX.text;
  let pic = '';
  if (src) pic = wrap(`<img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" width="${w}" class="email-image" style="--image-w:${w}px">`, 'email-image-link');
  else if (ctx.annotate) pic = `<span class="nte-image-empty" style="--image-w:${w}px">&nbsp;</span>`;
  const play = escapeAttr(ctx.globals.secondaryColor);
  const duration = b.duration.trim() ? ` <span class="video-duration" data-field="duration">· ${escapeHtml(b.duration)}</span>` : '';
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'mobile-padding image-cell video-block',
      `${pic}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="video-play-row">
          <tr>
            <td class="video-play-cell" width="32" height="32" align="center" valign="middle" bgcolor="${play}">${wrap('&#9654;&#xFE0E;', 'video-play-link')}</td>
            <td class="video-play-gap" width="10">&nbsp;</td>
            <td class="video-title-cell" valign="middle">${wrap(`<span data-field="title">${escapeHtml(b.title)}</span>`, 'video-title-link')}${duration}</td>
          </tr>
        </table>
      `,
    ),
  );
}

/** Column width and gutter per column count, inside the 504px text width. */
const TEASER_LAYOUT: Record<TeasersBlock['columns'], { col: number; gap: number }> = {
  2: { col: 242, gap: 20 },
  3: { col: 157, gap: 16 },
};

function renderTeaserCell(item: TeasersBlock['items'][number], index: number, w: number, ctx: RenderContext): string {
  const src = item.src.trim();
  const href = item.href.trim() ? resolveHref(item.href, ctx.mode) : '';
  let pic = '';
  if (src) {
    pic = `<img src="${escapeAttr(src)}" alt="${escapeAttr(item.alt)}" width="${w}" class="email-image teaser-img" style="--image-w:${w}px">`;
    if (href) pic = `<a href="${attrHref(href, ctx.mode)}" target="_blank" class="email-image-link">${pic}</a>`;
  } else if (ctx.annotate) {
    pic = `<span class="nte-image-empty teaser-img" style="--image-w:${w}px">&nbsp;</span>`;
  }
  const f = (k: string) => `items.${index}.${k}`;
  const title = item.title.trim() ? `<p class="teaser-title" data-field="${f('title')}">${escapeHtml(item.title)}</p>` : '';
  const text = item.text.trim() ? `<p class="teaser-text" data-field="${f('text')}">${plainTextToHtml(item.text)}</p>` : '';
  const link =
    item.linkText.trim() && href
      ? `<p class="teaser-link"><a href="${attrHref(href, ctx.mode)}" target="_blank" class="teaser-link-anchor" data-field="${f('linkText')}">${escapeHtml(item.linkText)}</a></p>`
      : '';
  return `${pic}${title}${text}${link}`;
}

/** Teasers in 2 or 3 columns; rows of `columns`, stacked into one column on phones. */
function renderTeasers(b: TeasersBlock, ctx: RenderContext): string {
  const { col, gap } = TEASER_LAYOUT[b.columns] ?? TEASER_LAYOUT[2];
  const rows: string[] = [];
  for (let start = 0; start < b.items.length; start += b.columns) {
    const cells: string[] = [];
    for (let c = 0; c < b.columns; c++) {
      const i = start + c;
      const item = b.items[i];
      if (c > 0) cells.push(`<td class="teaser-gap" width="${gap}">&nbsp;</td>`);
      cells.push(
        `<td class="teaser-col${start > 0 ? ' teaser-col-next' : ''}" width="${col}" valign="top">${
          item ? renderTeaserCell(item, i, col, ctx) : '&nbsp;'
        }</td>`,
      );
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-md teasers-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="teasers-table">
          ${rows.join('\n')}
        </table>
      `,
    ),
  );
}

/** Event: calendar sheet (month in the brand color, day, weekday), then title, time, place and buttons. */
function renderEvent(b: EventBlock, ctx: RenderContext): string {
  const sheet = eventSheet(b);
  const time = eventTimeRange(b);
  const place = eventPlace(b);
  const meta = [time, place].filter(Boolean).map(escapeHtml).join(' · ');
  const href = b.href.trim() ? resolveHref(b.href, ctx.mode) : '';
  const brand = escapeAttr(ctx.globals.secondaryColor);
  const button =
    b.buttonLabel.trim() && href
      ? `<td class="event-act cta-button-cell" bgcolor="#1d6bb8"><a href="${attrHref(href, ctx.mode)}" target="_blank" class="cta-button-link event-button-link"><span data-field="buttonLabel">${escapeHtml(b.buttonLabel)}</span></a></td>`
      : '';
  const calHref = b.calendar ? googleCalendarHref(b) : '';
  const calendar =
    calHref && b.calendarLabel.trim()
      ? `<td class="event-act event-cal-cell"><a href="${attrHref(resolveHref(calHref, ctx.mode), ctx.mode)}" target="_blank" class="event-cal-link" data-field="calendarLabel">${escapeHtml(b.calendarLabel)}</a></td>`
      : '';
  const acts = [button, calendar].filter(Boolean).join('<td class="event-act-gap" width="10">&nbsp;</td>');
  const date = sheet.day
    ? `
            <td class="event-col event-date-col" width="88" valign="top">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="88" class="event-sheet">
                <tr><td class="event-month" align="center" bgcolor="${brand}">${escapeHtml(sheet.month)}</td></tr>
                <tr><td class="event-day" align="center">${escapeHtml(sheet.day)}</td></tr>
                <tr><td class="event-weekday" align="center">${escapeHtml(sheet.weekday)}</td></tr>
              </table>
            </td>
            <td class="event-col event-gap" width="18">&nbsp;</td>`
    : '';
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-md event-block',
      `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="event-card">
          <tr>${date}
            <td class="event-col event-info" valign="top">
              ${b.title.trim() ? `<p class="event-title" data-field="title">${escapeHtml(b.title)}</p>` : ''}
              ${meta ? `<p class="event-meta">${meta}</p>` : ''}
              ${acts ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" class="event-acts"><tr>${acts}</tr></table>` : ''}
            </td>
          </tr>
        </table>
      `,
    ),
  );
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

/** Byline: small round photo or logo, name, role and company. */
function testimonialByline(b: TestimonialBlock): string {
  const src = b.imageMode !== 'none' ? b.src.trim() : '';
  const pic = src
    ? b.imageMode === 'logo'
      ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" height="36" class="testimonial-logo">`
      : `<img src="${escapeAttr(src)}" alt="${escapeAttr(b.alt)}" width="44" height="44" class="testimonial-photo">`
    : '';
  const name = b.name.trim() ? `<p class="testimonial-name" data-field="name">${escapeHtml(b.name)}</p>` : '';
  const role = b.role.trim() ? `<p class="testimonial-role" data-field="role">${escapeHtml(b.role)}</p>` : '';
  if (!pic && !name && !role) return '';
  return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="testimonial-by">
          <tr>
            ${pic ? `<td class="testimonial-by-pic" valign="middle">${pic}</td>` : ''}
            <td class="testimonial-by-text" valign="middle">${name}${role}</td>
          </tr>
        </table>`;
}

function renderTestimonial(b: TestimonialBlock, ctx: RenderContext): string {
  return rowWrap(
    b,
    ctx,
    contentTd(
      ctx,
      'block-pad-sm testimonial-block',
      `
        <p class="testimonial-quote" align="center">
          <span data-field="quote">${plainTextToHtml(b.quote)}</span>
        </p>${testimonialByline(b)}
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
    case 'testimonial':
      return renderTestimonial(block, ctx);
    case 'stat-box':
      return renderStatBox(block, ctx);
    case 'benefits-list':
      return renderBenefitsList(block, ctx);
    case 'price-box':
      return renderPriceBox(block, ctx);
    case 'cta-link-list':
      return renderCtaLinkList(block, ctx);
    case 'image':
      return renderImage(block, ctx);
    case 'image-text':
      return renderImageText(block, ctx);
    case 'greeting':
      return renderGreeting(block, ctx);
    case 'contact':
      return renderContact(block, ctx);
    case 'teasers':
      return renderTeasers(block, ctx);
    case 'event':
      return renderEvent(block, ctx);
    case 'video':
      return renderVideo(block, ctx);
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function renderBlocks(blocks: Block[], ctx: RenderContext): string {
  return blocks.map((b) => renderBlock(b, ctx)).join('\n');
}
