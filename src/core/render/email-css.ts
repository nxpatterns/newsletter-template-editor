import type { Block, Globals } from '../types';
import { effectiveSlotColors, type ColorTarget } from '../colors/edit';
import { blockColorCss, renderPalette } from './colors';
import { freeBlockCss, freeBlockFontCss, freeBlockMobileCss } from '../parts/css';
import { embeddedBlocks } from '../parts/embed';
import { EMAIL_CONTENT_WIDTH_PX, EMAIL_TEXT_WIDTH_PX, escapeAttr, fontStack } from './utils';

/**
 * Shared email document stylesheet (preview + export head).
 * Author with classes here; do not dump layout as inline styles in block markup.
 * Export-time CSS inlining (if needed for clients) is a separate pipeline step.
 * Colors come from the active color set: general colors as `--email-*` variables, colors set in
 * a block as rules scoped to that block (`blocks` is needed for those).
 */
export function emailDocumentCss(globals: Globals, blocks: readonly Block[] = []): string {
  const pal = renderPalette(globals);
  const c = (k: keyof typeof pal) => escapeAttr(pal[k]);
  const font = fontStack(globals);
  const sans = 'Helvetica, Arial, sans-serif';

  const vars: Record<string, string> = {
    page: c('page'),
    content: c('content'),
    surface: c('surface'),
    body: c('body'),
    head: c('head'),
    dim: c('dim'),
    link: c('link'),
    accent: c('accent'),
    btn: c('btn'),
    'btn-text': c('btnText'),
    line: c('line'),
    'stars-top': c('starsTop'),
    'stars-bottom': c('starsBottom'),
    font,
    sans,
  };
  /** Literal values for the dark block: clients that honour the media query do not all support var(). */
  const literal = (css: string) => css.replace(/var\(--email-([a-z-]+)\)/g, (m, k: string) => vars[k] ?? m);
  const free = [...blocks, ...blocks.flatMap((b) => embeddedBlocks(b).map((e) => e.block))].filter((b) => b.type === 'free');
  const freeCss = free.length
    ? [freeBlockCss(), ...free.flatMap((b) => freeBlockFontCss(`cb-${b.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`, b))].join('\n  ')
    : '';

  return `
  :root {
    color-scheme: ${globals.colors.mode === 'light' ? 'light only' : 'light dark'};
${Object.entries(vars).map(([k, v]) => `    --email-${k}: ${v};`).join('\n')}
  }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  table { border-collapse:collapse !important; }
  body {
    margin:0 !important;
    padding:0 !important;
    width:100% !important;
    background-color: var(--email-page) !important;
    font-family: var(--email-font);
  }

  .email-bg { background-color: var(--email-page); }
  .email-outer-pad { padding: 28px 16px; background-color: var(--email-page); }
  .email-container { max-width: ${EMAIL_CONTENT_WIDTH_PX}px; width: ${EMAIL_CONTENT_WIDTH_PX}px; }
  .content-bg { background-color: var(--email-content); }
  .header-bg { background-color: var(--email-content); padding: 32px 48px 28px 48px; }
  .footer-bg { background-color: var(--email-page); }
  .footer-notice-pad { padding: 28px 48px; }
  .footer-meta-pad { padding: 0 48px 36px 48px; }
  .chapter-bg, .stat-box-bg { background-color: var(--email-surface); }
  .price-box-bg { background-color: var(--email-surface); }

  .v-top { vertical-align: top; }
  .t-right { text-align: right; vertical-align: top; }
  .t-center { text-align: center; }

  .email-logo {
    display: inline-block;
    height: var(--logo-h, 48px);
    max-width: 100%;
    width: var(--logo-w, auto);
    border: 0;
    vertical-align: top;
  }
  .email-logo-link { display: inline-block; border: 0; }
  a.email-muted-link {
    color: var(--email-dim);
    text-decoration: none;
  }
  a.email-footer-link {
    color: var(--email-dim);
    text-decoration: underline;
  }

  .brand-stars {
    font-family: var(--email-font);
    font-size: 11px;
    color: var(--email-stars-top);
    letter-spacing: 5px;
    margin: 0 0 10px 0;
    line-height: 1;
  }
  .view-in-browser {
    font-family: var(--email-font);
    font-size: 12px;
    color: var(--email-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin: 0;
    line-height: 18px;
  }
  .view-in-browser--after-logo { margin-top: 8px; }
  .footer-notice {
    font-family: 'Trebuchet MS', Tahoma, Verdana, Arial, sans-serif;
    font-size: 14px;
    line-height: 20px;
    color: var(--email-dim);
    margin: 0;
    letter-spacing: normal;
  }
  .footer-rule-cell {
    height: 1px;
    background-color: var(--email-line);
    font-size: 0;
    line-height: 0;
  }
  .footer-stars-line {
    font-family: var(--email-font);
    font-size: 11px;
    color: var(--email-line);
    margin: 18px 0 0 0;
    text-align: center;
    letter-spacing: 3px;
  }
  .footer-stars-glyph {
    color: var(--email-stars-bottom);
    font-size: 9px;
  }
  .footer-company {
    font-family: var(--email-font);
    font-size: 12px;
    color: var(--email-dim);
    margin: 10px 0 0 0;
    text-align: center;
  }
  .footer-social {
    margin: 14px 0 12px 0;
    font-family: var(--email-font);
    font-size: 13px;
    line-height: 20px;
    color: var(--email-dim);
    text-align: center;
  }
  .footer-social--icons { line-height: 24px; }
  a.footer-social-link { text-decoration: none; }
  .footer-social-icon { display: inline-block; width: 24px; height: 24px; border: 0; vertical-align: middle; }
  .footer-links {
    font-family: var(--email-font);
    font-size: 12px;
    color: var(--email-dim);
    margin: 8px 0 0 0;
    text-align: center;
  }

  .preheader-hide {
    display: none;
    max-height: 0;
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    line-height: 1px;
    color: var(--email-page);
  }

  /* Shared block section pads */
  .block-pad-hero { padding: 52px 48px 48px 48px; background-color: var(--email-content); }
  .block-pad-md { padding: 24px 48px; background-color: var(--email-content); }
  .block-pad-sm { padding: 20px 48px; background-color: var(--email-content); }
  .block-pad-chapter { padding: 16px 48px; background-color: var(--email-surface); }

  /* Divider: full row width, no side padding */
  .divider-row { padding: 0; }
  .divider-row-spaced { padding: 10px 0; }
  .divider-hair { height: 1px; font-size: 0; line-height: 0; }
  .divider-ornament-glyph {
    font-family: var(--email-font);
    font-size: 12px;
    line-height: 12px;
    color: var(--email-accent);
  }
  .divider-glow-step { height: 2px; font-size: 0; line-height: 0; }
  .divider-line {
    height: 1px;
    background-color: var(--email-line);
    font-size: 0;
    line-height: 0;
  }
  .divider-two-tone-gap {
    height: 3px;
    font-size: 0;
    line-height: 0;
  }
  .divider-two-tone-mid {
    width: 80px;
    height: 3px;
    background-color: var(--email-btn);
    font-size: 0;
    line-height: 0;
  }
  .divider-two-tone-end {
    width: 120px;
    height: 3px;
    background-color: var(--email-link);
    font-size: 0;
    line-height: 0;
  }
  .divider-spacer {
    padding: 0;
    font-size: 0;
    line-height: 0;
    height: var(--divider-h, 24px);
  }

  /* Image: width attr for Outlook, fluid below the column width elsewhere. */
  .image-cell-full { padding: 0; }
  .image-cell { padding: 12px 48px; }
  .email-image {
    display: block;
    width: 100%;
    max-width: var(--image-w, ${EMAIL_TEXT_WIDTH_PX}px);
    height: auto;
    margin: 0 auto;
    border: 0;
    outline: none;
    text-decoration: none;
  }
  .email-image-link { display: block; }
  .image-caption {
    margin: 8px 0 0 0;
    font-family: var(--email-font);
    font-size: 12px;
    line-height: 18px;
    font-style: italic;
    color: var(--email-dim);
  }
  /* After .image-caption, so its side margin and the space below win. */
  .image-caption-full { margin: 8px 48px 12px 48px; }

  /* Image and text: two columns, stacked on phones (see the max-width media query) */
  .image-text-gap { width: 20px; font-size: 0; line-height: 0; }
  .image-text-copy { text-align: left; }

  /* Hero */
  .hero-label {
    font-family: var(--email-font);
    font-size: 14px;
    color: var(--email-accent);
    letter-spacing: 2px;
    margin: 0 0 28px 0;
  }
  .hero-headline {
    font-family: var(--email-font);
    color: var(--email-head);
    margin: 0;
    font-weight: 400;
    font-style: italic;
  }
  .hero-headline-inner { font-size: 26px; }

  /* Paragraph + lite rich-text size tokens */
  .paragraph-block { }
  .paragraph-body {
    font-family: var(--email-font);
    font-size: 17px;
    line-height: 30px;
    color: var(--email-body);
    margin: 0 0 16px 0;
  }
  .paragraph-body:last-child { margin-bottom: 0; }
  .rt-size-l { font-size: 20px; line-height: 32px; }
  .rt-size-xl { font-size: 26px; line-height: 36px; }
  .rt-size-s { font-size: 14px; line-height: 22px; }
  .rt-size-xs { font-size: 12px; line-height: 18px; }
  /* Ice-blue links: no underline at rest; underline on hover/focus only. */
  a.rt-link {
    color: var(--email-link);
    text-decoration: none;
    margin: 0 0.12em;
  }
  a.rt-link:hover,
  a.rt-link:focus {
    text-decoration: underline;
  }
  .paragraph-body strong { font-weight: 700; }
  .paragraph-body em { font-style: italic; }
  .paragraph-body s { text-decoration: line-through; }
  .paragraph-body code.rt-mono, .rt-mono {
    font-family: 'Courier New', Courier, monospace;
    font-size: 16px;
    line-height: 1.35;
  }

  /* CTA button */
  .cta-button-cell { background-color: var(--email-btn); }
  a.cta-button-link {
    display: inline-block;
    padding: 18px 48px;
    font-family: var(--email-font);
    font-size: 13px;
    font-weight: 700;
    color: var(--email-btn-text);
    text-decoration: none;
    text-transform: uppercase;
  }

  /* Chapter band */
  .chapter-title {
    font-family: var(--email-font);
    font-size: 14px;
    color: var(--email-accent);
    letter-spacing: 2px;
    margin: 0;
  }

  /* Pull quote */
  .pull-quote-bar {
    width: 3px;
    background-color: var(--email-link);
  }
  .pull-quote-body-cell { padding: 16px 0 16px 22px; }
  .pull-quote {
    font-family: var(--email-font);
    font-size: 22px;
    line-height: 34px;
    color: var(--email-head);
    margin: 0;
    font-style: italic;
  }

  /* Testimonial: centered quote, photo/logo + name + role below */
  .testimonial-quote {
    font-family: var(--email-font);
    font-size: 22px;
    line-height: 34px;
    color: var(--email-head);
    font-style: italic;
    text-align: center;
    margin: 0 0 18px 0;
  }
  .testimonial-by { margin: 0 auto; }
  .testimonial-by-pic { padding-right: 12px; }
  .testimonial-photo { display: block; width: 44px; height: 44px; border-radius: 50%; border: 0; }
  .testimonial-logo { display: block; height: 36px; width: auto; max-width: 140px; border: 0; }
  .testimonial-name {
    margin: 0;
    font-family: var(--email-font);
    font-size: 15px;
    line-height: 22px;
    font-weight: 700;
    color: var(--email-head);
  }
  .testimonial-role {
    margin: 0;
    font-family: var(--email-font);
    font-size: 13px;
    line-height: 20px;
    color: var(--email-dim);
  }

  /* Contact person */
  .contact-table { border-top: 1px solid rgba(127, 127, 127, 0.25); }
  .contact-col { padding-top: 18px; }
  .contact-photo-cell { padding-right: 20px; }
  .contact-photo { display: block; width: 72px; height: 72px; border-radius: 50%; border: 0; }
  .contact-intro, .contact-role {
    margin: 0;
    font-family: var(--email-font);
    font-size: 14px;
    line-height: 21px;
    color: var(--email-dim);
  }
  .contact-name {
    margin: 2px 0 0 0;
    font-family: var(--email-font);
    font-size: 17px;
    line-height: 24px;
    font-weight: 700;
    color: var(--email-head);
  }
  .contact-role { margin-bottom: 6px; }
  .contact-line {
    margin: 0;
    font-family: var(--email-font);
    font-size: 15px;
    line-height: 23px;
    color: var(--email-body);
  }
  a.contact-link { color: var(--email-link); text-decoration: underline; }
  .contact-button { margin-top: 12px; }
  a.contact-button-link { padding: 12px 24px; }

  /* Video preview: play row below the thumbnail (no overlay; Gmail/Outlook) */
  .video-play-row { margin-top: 12px; }
  .video-play-cell { width: 32px; height: 32px; border-radius: 50%; }
  a.video-play-link {
    display: block;
    font-family: Arial, sans-serif;
    font-size: 13px;
    line-height: 32px;
    color: var(--email-btn-text);
    text-decoration: none;
    padding-left: 2px;
  }
  .video-title-cell {
    font-family: var(--email-font);
    font-size: 16px;
    line-height: 24px;
    color: var(--email-dim);
  }
  a.video-title-link { color: var(--email-link); font-weight: 700; text-decoration: underline; }

  /* Teasers */
  .teaser-col-next { padding-top: 24px; }
  .teaser-img { margin-bottom: 12px; }
  .teaser-title {
    margin: 0 0 6px 0;
    font-family: var(--email-font);
    font-size: 17px;
    line-height: 23px;
    font-weight: 700;
    color: var(--email-head);
  }
  .teaser-text {
    margin: 0 0 8px 0;
    font-family: var(--email-font);
    font-size: 14px;
    line-height: 21px;
    color: var(--email-body);
  }
  .teaser-link { margin: 0; font-family: var(--email-font); font-size: 14px; line-height: 21px; }
  a.teaser-link-anchor { color: var(--email-link); font-weight: 700; text-decoration: underline; }

  /* Event: calendar sheet + details */
  .event-sheet { border: 1px solid rgba(127, 127, 127, 0.35); border-radius: 6px; border-collapse: separate; }
  .event-month {
    padding: 4px 0;
    font-family: Arial, sans-serif;
    font-size: 12px;
    line-height: 16px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--email-content);
    border-radius: 5px 5px 0 0;
  }
  .event-day {
    padding: 6px 0 0 0;
    font-family: var(--email-font);
    font-size: 32px;
    line-height: 36px;
    font-weight: 700;
    color: var(--email-head);
  }
  .event-weekday {
    padding: 0 4px 8px 4px;
    font-family: var(--email-font);
    font-size: 12px;
    line-height: 16px;
    color: var(--email-dim);
  }
  .event-title {
    margin: 0 0 4px 0;
    font-family: var(--email-font);
    font-size: 18px;
    line-height: 25px;
    font-weight: 700;
    color: var(--email-head);
  }
  .event-meta {
    margin: 0 0 12px 0;
    font-family: var(--email-font);
    font-size: 14px;
    line-height: 21px;
    color: var(--email-dim);
  }
  a.event-button-link { padding: 11px 20px; }
  a.event-cal-link {
    display: inline-block;
    padding: 10px 16px;
    font-family: var(--email-font);
    font-size: 14px;
    line-height: 20px;
    font-weight: 700;
    color: var(--email-link);
    text-decoration: none;
    border: 1px solid var(--email-link);
    border-radius: 4px;
  }

  /* Stat box */
  .stat-box-inner { padding: 28px 32px; background-color: var(--email-surface); }
  .stat-col-num { vertical-align: top; width: 50%; }
  .stat-col-geo {
    vertical-align: top;
    padding-left: 24px;
    border-left: 1px solid var(--email-line);
  }
  .stat-number {
    font-family: var(--email-font);
    font-size: 42px;
    color: var(--email-link);
    margin: 0 0 4px 0;
    font-weight: 400;
    line-height: 1;
  }
  .stat-label {
    font-family: var(--email-font);
    font-size: 13px;
    color: var(--email-dim);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .stat-geo {
    font-family: var(--email-font);
    font-size: 13px;
    color: var(--email-body);
    margin: 0 0 6px 0;
    line-height: 22px;
  }

  /* Benefits list */
  .benefits-list-block { padding: 20px 48px; background-color: var(--email-content); }
  .benefit-row-cell {
    padding: 14px 0;
    border-bottom: 1px solid var(--email-line);
  }
  .benefit-icon-cell {
    width: 25px;
    vertical-align: top;
    padding-top: 3px;
  }
  .benefit-icon {
    color: var(--email-link);
    font-size: 14px;
    font-family: var(--email-sans);
    line-height: 1;
  }
  .benefit-text-cell,
  .benefit-text {
    font-family: var(--email-font);
    font-size: 16px;
    color: var(--email-head);
    line-height: 1.35;
  }

  /* Price box */
  .price-box-outer { padding: 20px 48px; background-color: var(--email-content); }
  .price-box-inner {
    background-color: var(--email-surface);
    border: 1px solid var(--email-line);
    border-top: 3px solid var(--email-accent);
    padding: 24px 28px;
  }
  .price-badge {
    font-family: var(--email-sans);
    font-size: 16px;
    font-weight: 700;
    color: var(--email-surface);
    background-color: var(--email-accent);
    display: inline;
    padding: 3px 10px;
    text-transform: uppercase;
    margin: 0 0 14px 0;
  }
  .price-strike {
    font-family: var(--email-sans);
    font-size: 15px;
    color: var(--email-dim);
    margin: 0 0 4px 0;
  }
  /* Only the old amount is struck; "Statt" and the period stay readable. */
  .price-strike-amount { text-decoration: line-through; }
  .price-main {
    font-family: var(--email-sans);
    font-size: 38px;
    font-weight: 700;
    color: var(--email-head);
    margin: 0 0 6px 0;
    line-height: 1.1;
  }
  .price-currency {
    font-size: 16px;
    vertical-align: super;
    padding-right: 4px;
    color: var(--email-accent);
  }
  .price-period {
    font-size: 16px;
    font-weight: 300;
    color: var(--email-dim);
  }
  .price-details {
    font-family: var(--email-font);
    font-size: 14px;
    color: var(--email-body);
    margin: 0 0 10px 0;
    line-height: 22px;
  }
  .price-fine {
    font-family: var(--email-font);
    font-size: 13px;
    color: var(--email-dim);
    margin: 0;
    line-height: 20px;
    font-style: italic;
  }

  /* CTA link list */
  .cta-links-block { padding: 20px 48px; background-color: var(--email-content); }
  .cta-link-row-cell {
    padding: 14px 0;
    border-bottom: 1px solid var(--email-line);
  }
  .cta-link-row-cell--first {
    padding: 0 0 14px 0;
  }
  .cta-link-row-cell--last {
    padding: 14px 0 0 0;
    border-bottom: 0;
  }
  .cta-link-row-cell--only {
    padding: 0;
    border-bottom: 0;
  }
  .cta-link-body {
    font-family: var(--email-font);
    font-size: 14px;
    line-height: 24px;
    color: var(--email-dim);
    margin: 0;
  }
  .cta-link-icon {
    color: var(--email-link);
    margin-right: 8px;
  }
  .cta-link-label { color: var(--email-body); }
  a.cta-link-anchor {
    color: var(--email-link);
    text-decoration: underline;
  }

  .text-body { color: var(--email-body); }
  .text-head { color: var(--email-head); }
  .text-link { color: var(--email-link); }
  .text-accent, .text-chapter-label { color: var(--email-accent); }
  .text-dim { color: var(--email-dim); }
  .text-stat { color: var(--email-link); }
  .text-price-main { color: var(--email-head); }
  .text-price-strike { color: var(--email-dim); }
  .text-price-sub { color: var(--email-dim); }
  .text-price-detail { color: var(--email-body); }
  .text-price-fine { color: var(--email-dim); }
  .text-cta-body { color: var(--email-dim); }
  .text-benefit { color: var(--email-head); }
  .text-benefit-icon { color: var(--email-link); }
  .text-geo { color: var(--email-body); }

  ${freeCss}

  ${blockColorCss(globals, blocks)}

  @media (prefers-color-scheme: dark) {${literal(`
    body, .email-bg, .footer-bg { background-color: var(--email-page) !important; }
    .header-bg, .content-bg,
    .block-pad-hero, .block-pad-md, .block-pad-sm,
    .benefits-list-block, .price-box-outer, .cta-links-block {
      background-color: var(--email-content) !important;
    }
    .chapter-bg, .stat-box-bg, .block-pad-chapter, .stat-box-inner {
      background-color: var(--email-surface) !important;
    }
    .price-box-bg, .price-box-inner { background-color: var(--email-surface) !important; }
    .text-body, .paragraph-body, .stat-geo, .contact-line, .teaser-text { color: var(--email-body) !important; }
    .text-head, .hero-headline, .testimonial-name, .contact-name, .teaser-title, .event-title, .event-day { color: var(--email-head) !important; }
    .text-link, .text-stat, .stat-number, .cta-link-icon, a.cta-link-anchor, a.contact-link, a.video-title-link, a.teaser-link-anchor, a.event-cal-link {
      color: var(--email-link) !important;
    }
    .text-accent, .divider-ornament-glyph, .text-chapter-label, .hero-label, .chapter-title {
      color: var(--email-accent) !important;
    }
    .brand-stars { color: var(--email-stars-top) !important; }
    .footer-stars-glyph { color: var(--email-stars-bottom) !important; }
    .text-dim, .footer-notice, .footer-company, .footer-links, .testimonial-role, .contact-intro, .contact-role, .video-title-cell, .event-meta, .event-weekday { color: var(--email-dim) !important; }
    .text-price-main, .price-main { color: var(--email-head) !important; }
    .text-cta-body, .cta-link-body { color: var(--email-dim) !important; }
    .benefit-icon, .text-benefit-icon { color: var(--email-link) !important; }
    .benefit-text, .text-benefit { color: var(--email-head) !important; }
    ${blockColorCss(globals, blocks, true)}`)}
  }
  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-font-large, .hero-headline-inner { font-size: 26px !important; line-height: 36px !important; }
    .image-text-col { display: block !important; width: 100% !important; }
    .image-text-gap { display: none !important; }
    .image-text-pic { padding-bottom: 16px !important; }
    .image-text-img { max-width: 100% !important; }
    .contact-col { display: block !important; width: 100% !important; }
    .contact-photo-cell { padding-right: 0 !important; }
    .contact-info { padding-top: 12px !important; }
    .teaser-col { display: block !important; width: 100% !important; }
    .teaser-col-next, .teaser-col + .teaser-gap + .teaser-col { padding-top: 24px !important; }
    .teaser-gap { display: none !important; }
    .teaser-img { max-width: 100% !important; }
    .event-col { display: block !important; width: 100% !important; }
    .event-gap { display: none !important; }
    .event-info { padding-top: 14px !important; }
    .event-act { display: block !important; }
    .event-act-gap { display: none !important; }
    .event-cal-cell { padding-top: 10px !important; }
    ${free.length ? freeBlockMobileCss() : ''}
  }
  `;
}

/** @deprecated use emailDocumentCss — kept name for call-site clarity during transition */
export function darkModeCss(globals: Globals, blocks: readonly Block[] = []): string {
  return emailDocumentCss(globals, blocks);
}

/**
 * Paragraph lite editor surface: same type/color/link truth as email body copy.
 * Scoped under `.rt-editor.rt-clone` so app chrome colors stay untouched.
 * With `target`, background, base text and links use the block's effective colors (as in the
 * preview); inline color marks stay general colors there too.
 */
export function paragraphEditorSurfaceCss(globals: Globals, target?: ColorTarget): string {
  const pal = renderPalette(globals);
  const own = target ? effectiveSlotColors(globals.colors, target) : {};
  const contentBg = escapeAttr(own['background'] ?? pal.content);
  const text = escapeAttr(own['text'] ?? pal.body);
  const link = escapeAttr(own['link'] ?? pal.link);
  const markLink = escapeAttr(pal.link);
  const accent = escapeAttr(pal.accent);
  const head = escapeAttr(pal.head);
  const body = escapeAttr(pal.body);
  const font = fontStack(globals);
  const dim = escapeAttr(pal.dim);
  const w = EMAIL_CONTENT_WIDTH_PX;

  /* Preview selected-block chrome (shell PREVIEW_EDITOR_CHROME). */
  const selectOutline = '#20d4c8';
  const selectGlow = 'rgba(32, 212, 200, 0.95)';

  return `
.rt-editor.rt-clone {
  --email-content: ${contentBg};
  --email-link: ${link};
  --email-accent: ${accent};
  --email-head: ${head};
  --email-body: ${body};
  --email-text: ${text};
  --email-mark-link: ${markLink};
  --email-dim: ${dim};
  --email-font: ${font};
  box-sizing: border-box;
  background-color: var(--email-content) !important;
  color: var(--email-text) !important;
  font-family: var(--email-font) !important;
  padding: 24px 48px;
  /* Same solid turquoise frame as a selected block in the email preview. */
  box-shadow: inset 0 0 0 2px ${selectGlow};
  outline: 2px solid ${selectOutline};
  outline-offset: -2px;
  border-radius: 0;
}
.rt-editor.rt-clone.rt-email-width {
  width: ${w}px !important;
  min-width: ${w}px !important;
  max-width: ${w}px !important;
  flex-shrink: 0;
}
.rt-editor.rt-clone .paragraph-body {
  font-family: var(--email-font);
  font-size: 17px;
  line-height: 30px;
  color: var(--email-text);
  margin: 0 0 16px 0;
}
.rt-editor.rt-clone .paragraph-body:last-child { margin-bottom: 0; }
.rt-editor.rt-clone .rt-size-l { font-size: 20px; line-height: 32px; }
.rt-editor.rt-clone .rt-size-xl { font-size: 26px; line-height: 36px; }
.rt-editor.rt-clone .rt-size-s { font-size: 14px; line-height: 22px; }
.rt-editor.rt-clone .rt-size-xs { font-size: 12px; line-height: 18px; }
.rt-editor.rt-clone a.rt-link {
  color: var(--email-link);
  text-decoration: none;
  margin: 0 0.12em;
  cursor: pointer;
}
.rt-editor.rt-clone a.rt-link:hover,
.rt-editor.rt-clone a.rt-link:focus-visible {
  text-decoration: underline;
  outline: 1px dotted var(--email-link);
  outline-offset: 1px;
}
.rt-editor.rt-clone .paragraph-body strong { font-weight: 700; }
.rt-editor.rt-clone .paragraph-body em { font-style: italic; }
.rt-editor.rt-clone .paragraph-body s { text-decoration: line-through; }
.rt-editor.rt-clone .paragraph-body code.rt-mono,
.rt-editor.rt-clone .rt-name {
  display: inline-block;
  margin: 0 2px;
  padding: 0 7px;
  border: 1px dashed var(--email-link);
  border-radius: 4px;
  background: rgba(126, 207, 255, 0.12);
  color: var(--email-text);
  font-size: 0.85em;
  line-height: 1.6;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.rt-editor.rt-clone .rt-name::before { content: attr(data-label); }
.rt-editor.rt-clone .rt-mono {
  font-family: 'Courier New', Courier, monospace;
  /* Absolute size — relative em nested on every Mono click and shrank the text. */
  font-size: 16px;
  line-height: 1.35;
}
.rt-editor.rt-clone .text-body { color: var(--email-body); }
.rt-editor.rt-clone .text-head { color: var(--email-head); }
.rt-editor.rt-clone .text-link { color: var(--email-mark-link); }
.rt-editor.rt-clone .text-accent { color: var(--email-accent); }
.rt-editor.rt-clone .text-dim { color: var(--email-dim); }

/* Info inspect: one marker per kind (legend in the editor UI); no extra DOM inside contenteditable. */
.rt-editor.rt-clone.rt-info .paragraph-body[data-rt-info] {
  outline: 1px dashed color-mix(in srgb, var(--email-link) 55%, transparent);
  outline-offset: 4px;
  position: relative;
}
.rt-editor.rt-clone.rt-info .paragraph-body[data-rt-info]::after {
  content: attr(data-rt-info);
  display: table;
  margin-top: 0.4rem;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--email-link) 45%, transparent);
  background: color-mix(in srgb, var(--email-link) 12%, transparent);
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  color: var(--email-head);
  pointer-events: none;
  user-select: none;
}
/* Size: tinted background. */
.rt-editor.rt-clone.rt-info [data-rt-size],
.rt-editor.rt-clone.rt-info [class*="rt-size-"] {
  background: color-mix(in srgb, var(--email-link) 18%, transparent);
  border-radius: 2px;
}
/* Inline color (data attribute from toolbar, or class from seed/paint): dotted underline. */
.rt-editor.rt-clone.rt-info span[data-rt-color],
.rt-editor.rt-clone.rt-info span.text-head,
.rt-editor.rt-clone.rt-info span.text-link,
.rt-editor.rt-clone.rt-info span.text-accent,
.rt-editor.rt-clone.rt-info span.text-dim {
  text-decoration: underline dotted 2px;
  text-underline-offset: 4px;
}
/* Link: solid underline (links have none at rest). */
.rt-editor.rt-clone.rt-info a.rt-link {
  text-decoration: underline solid 1px;
  text-underline-offset: 3px;
}
/* Mono: framed box. */
.rt-editor.rt-clone.rt-info code.rt-mono {
  background: rgba(255, 255, 255, 0.08);
  outline: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 3px;
}
`;
}
