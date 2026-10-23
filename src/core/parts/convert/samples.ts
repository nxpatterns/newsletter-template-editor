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
];
