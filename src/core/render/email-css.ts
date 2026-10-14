import type { Globals } from '../types';
import { escapeAttr, fontStack } from './utils';

/**
 * Shared email document stylesheet (preview + export head).
 * Author with classes here; do not dump layout as inline styles in block markup.
 * Export-time CSS inlining (if needed for clients) is a separate pipeline step.
 */
export function emailDocumentCss(globals: Globals): string {
  const pageBg = escapeAttr(globals.pageBgColor);
  const contentBg = escapeAttr(globals.contentBgColor);
  const accent = escapeAttr(globals.accentColor);
  const gold = escapeAttr(globals.goldColor);
  const heading = escapeAttr(globals.headingColor);
  const body = escapeAttr(globals.bodyTextColor);
  const font = fontStack(globals);
  const sans = 'Helvetica, Arial, sans-serif';

  return `
  :root {
    color-scheme: light dark;
    --email-page-bg: ${pageBg};
    --email-content-bg: ${contentBg};
    --email-accent: ${accent};
    --email-gold: ${gold};
    --email-heading: ${heading};
    --email-body: ${body};
    --email-font: ${font};
    --email-sans: ${sans};
    --email-chapter-bg: #060e1a;
    --email-price-bg: #060d1a;
    --email-rule: #1a3050;
    --email-dim: #4a6a88;
  }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  table { border-collapse:collapse !important; }
  body {
    margin:0 !important;
    padding:0 !important;
    width:100% !important;
    background-color: var(--email-page-bg) !important;
    font-family: var(--email-font);
  }

  .email-bg { background-color: var(--email-page-bg); }
  .email-outer-pad { padding: 28px 16px; background-color: var(--email-page-bg); }
  .email-container { max-width: 600px; width: 600px; }
  .content-bg { background-color: var(--email-content-bg); }
  .header-bg { background-color: var(--email-content-bg); padding: 32px 48px 28px 48px; }
  .footer-bg { background-color: var(--email-page-bg); }
  .footer-notice-pad { padding: 28px 48px; }
  .footer-meta-pad { padding: 0 48px 36px 48px; }
  .chapter-bg, .stat-box-bg { background-color: var(--email-chapter-bg); }
  .price-box-bg { background-color: var(--email-price-bg); }

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
    color: #1e3a5c;
    text-decoration: none;
  }
  a.email-footer-link {
    color: var(--email-dim);
    text-decoration: underline;
  }

  .brand-stars {
    font-family: var(--email-font);
    font-size: 11px;
    color: var(--email-gold);
    letter-spacing: 5px;
    margin: 0 0 10px 0;
    line-height: 1;
  }
  .view-in-browser {
    font-family: var(--email-font);
    font-size: 10px;
    color: #1e3a5c;
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
    letter-spacing: 2px;
  }
  .footer-rule-cell {
    height: 1px;
    background-color: #0c1a2e;
    font-size: 0;
    line-height: 0;
  }
  .footer-stars-line {
    font-family: var(--email-font);
    font-size: 11px;
    color: #1a3050;
    margin: 18px 0 0 0;
    text-align: center;
    letter-spacing: 3px;
  }
  .footer-stars-glyph {
    color: var(--email-gold);
    font-size: 9px;
  }
  .footer-company {
    font-family: var(--email-font);
    font-size: 12px;
    color: var(--email-dim);
    margin: 10px 0 0 0;
    text-align: center;
  }
  .footer-links {
    font-family: var(--email-font);
    font-size: 12px;
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
    color: var(--email-page-bg);
  }

  /* Shared block section pads */
  .block-pad-hero { padding: 52px 48px 48px 48px; background-color: var(--email-content-bg); }
  .block-pad-md { padding: 24px 48px; background-color: var(--email-content-bg); }
  .block-pad-sm { padding: 20px 48px; background-color: var(--email-content-bg); }
  .block-pad-chapter { padding: 16px 48px; background-color: var(--email-chapter-bg); }
  .block-pad-x { padding: 0 48px; background-color: var(--email-content-bg); }

  /* Divider */
  .divider-line {
    height: 1px;
    background-color: var(--email-rule);
    font-size: 0;
    line-height: 0;
  }
  .divider-accent-gap {
    height: 3px;
    background-color: var(--email-content-bg);
    font-size: 0;
    line-height: 0;
  }
  .divider-accent-mid {
    width: 80px;
    height: 3px;
    background-color: #1e6bb8;
    font-size: 0;
    line-height: 0;
  }
  .divider-accent-end {
    width: 120px;
    height: 3px;
    background-color: var(--email-accent);
    font-size: 0;
    line-height: 0;
  }
  .divider-spacer {
    padding: 0;
    background-color: var(--email-content-bg);
    font-size: 0;
    line-height: 0;
    height: var(--divider-h, 24px);
  }

  /* Hero */
  .hero-label {
    font-family: var(--email-font);
    font-size: 14px;
    color: var(--email-gold);
    letter-spacing: 2px;
    margin: 0 0 28px 0;
  }
  .hero-headline {
    font-family: var(--email-font);
    color: var(--email-heading);
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
  .rt-size-lead { font-size: 20px; line-height: 32px; }
  .rt-size-callout { font-size: 26px; line-height: 36px; }
  .rt-size-fine { font-size: 14px; line-height: 22px; }
  .rt-size-caption { font-size: 12px; line-height: 18px; }
  /* Ice-blue links: no underline at rest; underline on hover/focus only. */
  a.rt-link {
    color: var(--email-accent);
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
    font-size: 0.95em;
  }

  /* CTA button */
  .cta-button-cell { background-color: #1d6bb8; }
  a.cta-button-link {
    display: inline-block;
    padding: 18px 48px;
    font-family: var(--email-font);
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    text-decoration: none;
    text-transform: uppercase;
  }

  /* Chapter band */
  .chapter-title {
    font-family: var(--email-font);
    font-size: 14px;
    color: var(--email-gold);
    letter-spacing: 2px;
    margin: 0;
  }

  /* Pull quote */
  .pull-quote-bar {
    width: 3px;
    background-color: var(--email-accent);
  }
  .pull-quote-body-cell { padding: 16px 0 16px 22px; }
  .pull-quote {
    font-family: var(--email-font);
    font-size: 22px;
    line-height: 34px;
    color: #c8dff0;
    margin: 0;
    font-style: italic;
  }

  /* Stat box */
  .stat-box-inner { padding: 28px 32px; background-color: var(--email-chapter-bg); }
  .stat-col-num { vertical-align: top; width: 50%; }
  .stat-col-geo {
    vertical-align: top;
    padding-left: 24px;
    border-left: 1px solid #0e1e34;
  }
  .stat-number {
    font-family: var(--email-font);
    font-size: 42px;
    color: var(--email-accent);
    margin: 0 0 4px 0;
    font-weight: 400;
    line-height: 1;
  }
  .stat-label {
    font-family: var(--email-font);
    font-size: 13px;
    color: #3e84c6;
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
  .benefits-list-block { padding: 20px 48px; background-color: var(--email-content-bg); }
  .benefit-row-cell {
    padding: 14px 0;
    border-bottom: 1px solid #0a1828;
  }
  .benefit-icon-cell {
    width: 25px;
    vertical-align: top;
    padding-top: 3px;
  }
  .benefit-icon {
    color: #4db8ff;
    font-size: 14px;
    font-family: var(--email-sans);
    line-height: 1;
  }
  .benefit-text-cell,
  .benefit-text {
    font-family: var(--email-font);
    font-size: 16px;
    color: #b9f2ff;
    line-height: 1.35;
  }

  /* Price box */
  .price-box-outer { padding: 20px 48px; background-color: var(--email-content-bg); }
  .price-box-inner {
    background-color: var(--email-price-bg);
    border: 1px solid #111d33;
    border-top: 3px solid var(--email-gold);
    padding: 24px 28px;
  }
  .price-badge {
    font-family: var(--email-sans);
    font-size: 16px;
    font-weight: 700;
    color: var(--email-price-bg);
    background-color: var(--email-gold);
    display: inline;
    padding: 3px 10px;
    text-transform: uppercase;
    margin: 0 0 14px 0;
  }
  .price-strike {
    font-family: var(--email-sans);
    font-size: 15px;
    color: #02fdfb;
    margin: 0 0 4px 0;
    text-decoration: line-through;
  }
  .price-main {
    font-family: var(--email-sans);
    font-size: 38px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px 0;
    line-height: 1.1;
  }
  .price-currency {
    font-size: 16px;
    vertical-align: super;
    padding-right: 4px;
    color: var(--email-gold);
  }
  .price-period {
    font-size: 16px;
    font-weight: 300;
    color: var(--email-dim);
  }
  .price-details {
    font-family: var(--email-font);
    font-size: 14px;
    color: #72bde9;
    margin: 0 0 10px 0;
    line-height: 22px;
  }
  .price-fine {
    font-family: var(--email-font);
    font-size: 13px;
    color: #2c4d66;
    margin: 0;
    line-height: 20px;
    font-style: italic;
  }

  /* CTA link list */
  .cta-links-block { padding: 20px 48px; background-color: var(--email-content-bg); }
  .cta-link-row-cell {
    padding: 14px 0;
    border-bottom: 1px solid #0a1828;
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
    color: #3a6080;
    margin: 0;
  }
  .cta-link-icon {
    color: var(--email-accent);
    margin-right: 8px;
  }
  .cta-link-label { color: #5a8aaa; }
  a.cta-link-anchor {
    color: var(--email-accent);
    text-decoration: underline;
  }

  .text-body { color: var(--email-body); }
  .text-heading { color: var(--email-heading); }
  .text-accent { color: var(--email-accent); }
  .text-gold, .text-chapter-label { color: var(--email-gold); }
  .text-dim { color: var(--email-dim); }
  .text-stat { color: var(--email-accent); }
  .text-price-main { color: #ffffff; }
  .text-price-strike { color: #02fdfb; }
  .text-price-sub { color: var(--email-dim); }
  .text-price-detail { color: #72bde9; }
  .text-price-fine { color: #2c4d66; }
  .text-cta-body { color: #3a6080; }
  .text-benefit { color: #b9f2ff; }
  .text-benefit-icon { color: #4db8ff; }
  .text-geo { color: var(--email-body); }

  @media (prefers-color-scheme: dark) {
    body, .email-bg, .footer-bg { background-color: var(--email-page-bg) !important; }
    .header-bg, .content-bg,
    .block-pad-hero, .block-pad-md, .block-pad-sm, .block-pad-x,
    .benefits-list-block, .price-box-outer, .cta-links-block {
      background-color: var(--email-content-bg) !important;
    }
    .chapter-bg, .stat-box-bg, .block-pad-chapter, .stat-box-inner {
      background-color: var(--email-chapter-bg) !important;
    }
    .price-box-bg, .price-box-inner { background-color: var(--email-price-bg) !important; }
    .text-body, .paragraph-body, .stat-geo { color: var(--email-body) !important; }
    .text-heading, .hero-headline { color: var(--email-heading) !important; }
    .text-accent, .text-stat, .stat-number, .cta-link-icon, a.cta-link-anchor {
      color: var(--email-accent) !important;
    }
    .text-gold, .text-chapter-label, .hero-label, .chapter-title, .brand-stars, .footer-stars-glyph {
      color: var(--email-gold) !important;
    }
    .text-dim, .footer-notice, .footer-company { color: var(--email-dim) !important; }
    .text-price-main, .price-main { color: #ffffff !important; }
    .text-cta-body, .cta-link-body { color: #3a6080 !important; }
    .benefit-icon, .text-benefit-icon { color: #4db8ff !important; }
    .benefit-text, .text-benefit { color: #b9f2ff !important; }
  }
  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-font-large, .hero-headline-inner { font-size: 26px !important; line-height: 36px !important; }
  }
  `;
}

/** @deprecated use emailDocumentCss — kept name for call-site clarity during transition */
export function darkModeCss(globals: Globals): string {
  return emailDocumentCss(globals);
}
