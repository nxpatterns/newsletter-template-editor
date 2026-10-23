import type { BuiltInBlock, ParagraphBlock } from '../../types';

/** Sample blocks per converted type: the gate compares their exports (screenshots and the text check). */
/** A self-contained sample picture (no network in the harness): a landscape or a portrait with a frame and a sun. */
function picture(w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#3a6f8f"/><rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#f4c95d" stroke-width="4"/><circle cx="${w * 0.7}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.12}" fill="#f4c95d"/><path d="M0 ${h} L${w * 0.35} ${h * 0.55} L${w * 0.6} ${h * 0.8} L${w * 0.8} ${h * 0.6} L${w} ${h} Z" fill="#1e3b4d"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const LANDSCAPE = picture(1200, 600);
const PORTRAIT = picture(480, 600);

const copy = (text: string, link?: string): ParagraphBlock['body'] => [
  {
    type: 'p',
    children: [
      { type: 'text', text },
      ...(link ? [{ type: 'text' as const, text: ' Read more', marks: { link: { href: link } } }] : []),
    ],
  },
];

export interface GateSample {
  name: string;
  block: BuiltInBlock;
}

export const GATE_SAMPLES: readonly GateSample[] = [
  {
    name: 'Paragraph, one line',
    block: { id: 'p1', type: 'paragraph', body: [{ type: 'p', children: [{ type: 'text', text: 'New paragraph.' }] }] },
  },
  {
    name: 'Paragraph, marks, link, name and sizes',
    block: {
      id: 'p2',
      type: 'paragraph',
      body: [
        {
          type: 'p',
          children: [
            { type: 'name', lead: 'Hello', fallback: 'Dear business partners', marks: { bold: true } },
            { type: 'text', text: ', here is what changed this month. ' },
            { type: 'text', text: 'Read the full story', marks: { link: { href: 'https://cloudlib.eu/news' } } },
            { type: 'text', text: ' or write to ' },
            { type: 'text', text: 'hello@cloudlib.eu', marks: { link: { href: 'mailto:hello@cloudlib.eu' } } },
            { type: 'text', text: '.' },
          ],
        },
        {
          type: 'p',
          children: [
            { type: 'text', text: 'Bold', marks: { bold: true } },
            { type: 'text', text: ', ' },
            { type: 'text', text: 'italic', marks: { italic: true } },
            { type: 'text', text: ', ' },
            { type: 'text', text: 'struck', marks: { strike: true } },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'mono', marks: { mono: true } },
            { type: 'br' },
            { type: 'text', text: 'Larger words', marks: { size: 'l' } },
            { type: 'text', text: ' and an accent', marks: { color: 'accent' } },
            { type: 'text', text: '.' },
          ],
        },
        { type: 'p', color: 'dim', children: [{ type: 'text', text: 'A dim closing paragraph.' }] },
      ],
    },
  },
  { name: 'Hero', block: { id: 'h1', type: 'hero', label: 'NEWSLETTER · OCTOBER 2026', headline: 'Virtual tours that sell\nyour space for you' } },
  { name: 'Chapter band', block: { id: 'c1', type: 'chapter-band', title: 'WHAT IS NEW' } },
  {
    name: 'Pull quote',
    block: { id: 'q1', type: 'pull-quote', quote: 'Since we added the tour, viewings dropped by half and every visitor arrives ready to sign.' },
  },
  { name: 'CTA button', block: { id: 'b1', type: 'cta-button', text: 'Book a demo', href: 'https://cloudlib.eu/demo' } },
  { name: 'Divider, thin', block: { id: 'd1', type: 'divider', style: 'thin', background: 'content' } },
  { name: 'Divider, two-tone', block: { id: 'd2', type: 'divider', style: 'two-tone', background: 'content' } },
  { name: 'Divider, ornament', block: { id: 'd3', type: 'divider', style: 'ornament', background: 'content' } },
  { name: 'Divider, ornament, page background', block: { id: 'd4', type: 'divider', style: 'ornament', background: 'page' } },
  { name: 'Divider, glow', block: { id: 'd5', type: 'divider', style: 'glow', background: 'content' } },
  { name: 'Divider, glow, page background', block: { id: 'd6', type: 'divider', style: 'glow', background: 'page' } },
  { name: 'Divider, spacer only', block: { id: 'd7', type: 'divider', style: 'spacer-only', background: 'content' } },
  { name: 'Divider, spacer only, 40 px, page background', block: { id: 'd8', type: 'divider', style: 'spacer-only', background: 'page', heightPx: 40 } },
  {
    name: 'Image, full width, link and caption',
    block: { id: 'i1', type: 'image', src: LANDSCAPE, alt: 'Harbour at dusk', href: 'https://cloudlib.eu/tours', caption: 'The harbour office, as a 3D tour.', width: 'full' },
  },
  {
    name: 'Image, text width, caption',
    block: { id: 'i2', type: 'image', src: LANDSCAPE, alt: 'Harbour at dusk', href: '', caption: 'Two lines of caption:\nthe second one after a line break.', width: 'text' },
  },
  { name: 'Image, small, link', block: { id: 'i3', type: 'image', src: PORTRAIT, alt: 'Portrait', href: 'https://cloudlib.eu', caption: '', width: 'small' } },
  {
    name: 'Image and text, left, third, top',
    block: {
      id: 'it1',
      type: 'image-text',
      src: PORTRAIT,
      alt: 'Portrait',
      href: 'https://cloudlib.eu/team',
      body: copy('Our team walks every room before the shoot, so the tour shows what a visitor would see first. That takes an hour and saves a week of questions later.', 'https://cloudlib.eu/team'),
      side: 'left',
      imageWidth: 'third',
      valign: 'top',
    },
  },
  {
    name: 'Image and text, right, half, middle',
    block: {
      id: 'it2',
      type: 'image-text',
      src: LANDSCAPE,
      alt: 'Harbour at dusk',
      href: '',
      body: copy('Short copy beside a wide picture.'),
      side: 'right',
      imageWidth: 'half',
      valign: 'middle',
    },
  },
  {
    name: 'Image and text, right, third, middle, text taller',
    block: {
      id: 'it3',
      type: 'image-text',
      src: LANDSCAPE,
      alt: 'Harbour at dusk',
      href: '',
      body: copy('A long text next to a small landscape picture: the old renderer keeps the picture at the top while the text is set to middle, so this sample shows whether both columns follow the same vertical alignment or each its own. Three or four lines are enough to see it.'),
      side: 'right',
      imageWidth: 'third',
      valign: 'middle',
    },
  },
];
