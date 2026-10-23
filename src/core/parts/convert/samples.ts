import type { BuiltInBlock } from '../../types';

/** Sample blocks per converted type: the gate compares their exports (screenshots and the text check). */
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
];
