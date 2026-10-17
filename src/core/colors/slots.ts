import type { ColorRole } from './model';

/**
 * Every color of a block that the user can change, as the single source for the renderer
 * (which CSS it overrides) and the editor (which rows it shows, which contrast pair it checks).
 *
 * kind `text` is checked for contrast against the slot named in `on`; `fill` is a surface or
 * button face; `line` is a rule or border; `mark` is decoration (glyphs, bars).
 */
export type SlotKind = 'text' | 'fill' | 'line' | 'mark';

export interface ColorSlotDef {
  /** Stable key, stored in the document. */
  key: string;
  /** General color the slot follows until it is changed in the block. */
  role: ColorRole;
  kind: SlotKind;
  /** Slot of the same block this one sits on (contrast pair). Default: `background`. */
  on?: string;
  /** CSS: selector under the block root → properties that carry the color. */
  css: readonly { sel: string; prop: 'color' | 'background-color' | 'border-color' | 'border-top-color' }[];
  /** `bgcolor` attribute is written too (mail clients). */
  attr?: true;
}

const bg = (sel: string): ColorSlotDef['css'][number] => ({ sel, prop: 'background-color' });
const fg = (sel: string): ColorSlotDef['css'][number] => ({ sel, prop: 'color' });
const bd = (sel: string): ColorSlotDef['css'][number] => ({ sel, prop: 'border-color' });

const BG = (sel = '.content-bg'): ColorSlotDef => ({
  key: 'background',
  role: 'content',
  kind: 'fill',
  css: [bg(sel)],
  attr: true,
});

export const BLOCK_COLOR_SLOTS: Readonly<Record<string, readonly ColorSlotDef[]>> = {
  header: [
    { key: 'background', role: 'content', kind: 'fill', css: [bg('.header-bg')] },
    { key: 'stars', role: 'accent', kind: 'mark', css: [fg('.brand-stars')] },
    { key: 'viewInBrowser', role: 'dim', kind: 'text', css: [fg('.view-in-browser'), fg('a.email-muted-link')] },
  ],
  footer: [
    { key: 'background', role: 'page', kind: 'fill', css: [bg('.footer-bg')] },
    { key: 'text', role: 'dim', kind: 'text', css: [fg('.footer-notice'), fg('.footer-company'), fg('.footer-social'), fg('a.email-footer-link')] },
    { key: 'line', role: 'line', kind: 'line', css: [bg('.footer-rule-cell'), fg('.footer-stars-line')] },
    { key: 'stars', role: 'accent', kind: 'mark', css: [fg('.footer-stars-glyph')] },
  ],
  divider: [
    { key: 'line', role: 'line', kind: 'line', css: [bg('.divider-line')] },
    { key: 'mark', role: 'btn', kind: 'mark', css: [bg('.divider-two-tone-mid')] },
    { key: 'tone', role: 'link', kind: 'mark', css: [bg('.divider-two-tone-end')] },
    { key: 'ornament', role: 'accent', kind: 'mark', css: [fg('.divider-ornament-glyph')] },
  ],
  hero: [
    BG(),
    { key: 'label', role: 'accent', kind: 'text', css: [fg('.hero-label')] },
    { key: 'headline', role: 'head', kind: 'text', css: [fg('.hero-headline')] },
  ],
  paragraph: [
    BG(),
    { key: 'text', role: 'body', kind: 'text', css: [fg('.paragraph-body')] },
    { key: 'link', role: 'link', kind: 'text', css: [fg('a.rt-link')] },
  ],
  greeting: [BG(), { key: 'text', role: 'body', kind: 'text', css: [fg('.paragraph-body')] }],
  'cta-button': [
    BG(),
    { key: 'button', role: 'btn', kind: 'fill', css: [bg('.cta-button-cell')], attr: true },
    { key: 'buttonText', role: 'btnText', kind: 'text', on: 'button', css: [fg('a.cta-button-link')] },
  ],
  'chapter-band': [
    { key: 'background', role: 'surface', kind: 'fill', css: [bg('.chapter-bg')], attr: true },
    { key: 'title', role: 'accent', kind: 'text', css: [fg('.chapter-title')] },
  ],
  'pull-quote': [
    BG(),
    { key: 'bar', role: 'link', kind: 'mark', css: [bg('.pull-quote-bar')] },
    { key: 'text', role: 'head', kind: 'text', css: [fg('.pull-quote')] },
  ],
  testimonial: [
    BG(),
    { key: 'quote', role: 'head', kind: 'text', css: [fg('.testimonial-quote')] },
    { key: 'name', role: 'head', kind: 'text', css: [fg('.testimonial-name')] },
    { key: 'role', role: 'dim', kind: 'text', css: [fg('.testimonial-role')] },
  ],
  'stat-box': [
    BG(),
    { key: 'box', role: 'surface', kind: 'fill', css: [bg('.stat-box-inner')], attr: true },
    { key: 'number', role: 'link', kind: 'text', on: 'box', css: [fg('.stat-number')] },
    { key: 'label', role: 'dim', kind: 'text', on: 'box', css: [fg('.stat-label')] },
    { key: 'text', role: 'body', kind: 'text', on: 'box', css: [fg('.stat-geo')] },
    { key: 'divider', role: 'line', kind: 'line', css: [bd('.stat-col-geo')] },
  ],
  'benefits-list': [
    BG(),
    { key: 'icon', role: 'link', kind: 'mark', css: [fg('.benefit-icon')] },
    { key: 'text', role: 'head', kind: 'text', css: [fg('.benefit-text'), fg('.benefit-text-cell')] },
    { key: 'line', role: 'line', kind: 'line', css: [bd('.benefit-row-cell')] },
  ],
  'price-box': [
    BG(),
    { key: 'box', role: 'surface', kind: 'fill', css: [bg('.price-box-inner')], attr: true },
    { key: 'frame', role: 'line', kind: 'line', css: [bd('.price-box-inner')] },
    { key: 'top', role: 'accent', kind: 'mark', css: [{ sel: '.price-box-inner', prop: 'border-top-color' }] },
    { key: 'badge', role: 'accent', kind: 'fill', css: [bg('.price-badge')] },
    { key: 'badgeText', role: 'surface', kind: 'text', on: 'badge', css: [fg('.price-badge')] },
    { key: 'oldPrice', role: 'dim', kind: 'text', on: 'box', css: [fg('.price-strike')] },
    { key: 'price', role: 'head', kind: 'text', on: 'box', css: [fg('.price-main')] },
    { key: 'currency', role: 'accent', kind: 'text', on: 'box', css: [fg('.price-currency')] },
    { key: 'period', role: 'dim', kind: 'text', on: 'box', css: [fg('.price-period')] },
    { key: 'details', role: 'body', kind: 'text', on: 'box', css: [fg('.price-details')] },
    { key: 'fine', role: 'dim', kind: 'text', on: 'box', css: [fg('.price-fine')] },
  ],
  'cta-link-list': [
    BG(),
    { key: 'text', role: 'dim', kind: 'text', css: [fg('.cta-link-body')] },
    { key: 'label', role: 'body', kind: 'text', css: [fg('.cta-link-label')] },
    { key: 'link', role: 'link', kind: 'text', css: [fg('a.cta-link-anchor'), fg('.cta-link-icon')] },
    { key: 'line', role: 'line', kind: 'line', css: [bd('.cta-link-row-cell')] },
  ],
  image: [BG(), { key: 'caption', role: 'dim', kind: 'text', css: [fg('.image-caption')] }],
  'image-text': [BG(), { key: 'text', role: 'body', kind: 'text', css: [fg('.paragraph-body')] }],
  contact: [
    BG(),
    { key: 'intro', role: 'dim', kind: 'text', css: [fg('.contact-intro')] },
    { key: 'name', role: 'head', kind: 'text', css: [fg('.contact-name')] },
    { key: 'role', role: 'dim', kind: 'text', css: [fg('.contact-role')] },
    { key: 'text', role: 'body', kind: 'text', css: [fg('.contact-line')] },
    { key: 'link', role: 'link', kind: 'text', css: [fg('a.contact-link')] },
    { key: 'button', role: 'btn', kind: 'fill', css: [bg('.cta-button-cell')], attr: true },
    { key: 'buttonText', role: 'btnText', kind: 'text', on: 'button', css: [fg('a.cta-button-link')] },
  ],
  video: [
    BG(),
    { key: 'play', role: 'link', kind: 'fill', css: [bg('.video-play-cell')], attr: true },
    { key: 'playIcon', role: 'content', kind: 'text', on: 'play', css: [fg('a.video-play-link')] },
    { key: 'text', role: 'dim', kind: 'text', css: [fg('.video-title-cell')] },
    { key: 'link', role: 'link', kind: 'text', css: [fg('a.video-title-link')] },
  ],
  teasers: [
    BG(),
    { key: 'title', role: 'head', kind: 'text', css: [fg('.teaser-title')] },
    { key: 'text', role: 'body', kind: 'text', css: [fg('.teaser-text')] },
    { key: 'link', role: 'link', kind: 'text', css: [fg('a.teaser-link-anchor')] },
  ],
  event: [
    BG(),
    { key: 'month', role: 'link', kind: 'fill', css: [bg('.event-month')], attr: true },
    { key: 'monthText', role: 'content', kind: 'text', on: 'month', css: [fg('.event-month')] },
    { key: 'day', role: 'head', kind: 'text', css: [fg('.event-day')] },
    { key: 'weekday', role: 'dim', kind: 'text', css: [fg('.event-weekday')] },
    { key: 'title', role: 'head', kind: 'text', css: [fg('.event-title')] },
    { key: 'meta', role: 'dim', kind: 'text', css: [fg('.event-meta')] },
    { key: 'button', role: 'btn', kind: 'fill', css: [bg('.cta-button-cell')], attr: true },
    { key: 'buttonText', role: 'btnText', kind: 'text', on: 'button', css: [fg('a.cta-button-link')] },
    { key: 'calendar', role: 'link', kind: 'text', css: [fg('a.event-cal-link'), bd('a.event-cal-link')] },
  ],
};

export function colorSlotsOf(type: string): readonly ColorSlotDef[] {
  return BLOCK_COLOR_SLOTS[type] ?? [];
}
