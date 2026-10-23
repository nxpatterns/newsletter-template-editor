import type { RichInline } from '../../richtext/model';
import type { PriceBoxBlock, StatBoxBlock } from '../../types';
import type { LayoutNode, TextContent } from '../model';
import type { Converted } from '.';
import { line } from './people';
import { border, space, textSize } from './snap';

/**
 * Stat box: a surface box (padding 28 / 32 px) with two halves that stay side by side on phones.
 * Left the number 42 / 42 px in the link color, 4 px above the label 13 px uppercase, 2 px apart,
 * dim; right the extras 13 / 22 px behind a hairline with 24 px before them. Block padding
 * 20 / 48 px. Padding is symmetric: 24 px on both sides of the extras would push the box past a
 * 320 px phone, so they get 12 px on each side (model gap, step 11); a line height of 1 is not on
 * the scale (tight).
 */
export function statToParts(b: StatBoxBlock): Converted {
  const parts: TextContent[] = [...line('t1', 'body', b.number), ...line('t2', 'small', b.label), ...line('t3', 'body', b.geo)];
  const has = (id: string) => parts.some((p) => p.id === id);
  const num: LayoutNode[] = [
    ...(has('t1') ? [{ id: 'n4', kind: 'text' as const, part: 't1', size: textSize(42), lineHeight: 'tight' as const }] : []),
    ...(has('t1') && has('t2') ? [{ id: 'n5', kind: 'spacer' as const, height: space(4) }] : []),
    ...(has('t2') ? [{ id: 'n6', kind: 'text' as const, part: 't2', size: textSize(13), uppercase: true, letterSpacing: 'wider' as const }] : []),
  ];
  const geo: LayoutNode[] = has('t3')
    ? [{ id: 'n7', kind: 'box', border: '1', borderSides: 'left', padH: space(12), children: [{ id: 'n8', kind: 'text', part: 't3', size: textSize(13), lineHeight: 'loose' }] }]
    : [];
  return {
    content: { parts, collections: [] },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(20) },
        children: [
          {
            id: 'n1',
            kind: 'box',
            bg: true,
            padV: space(28),
            padH: space(32),
            children: [
              {
                id: 'n2',
                kind: 'columns',
                ratio: '1:1',
                gap: '0',
                stack: false,
                columns: [
                  { id: 'c1', children: num },
                  { id: 'c2', children: geo },
                ],
              },
            ],
          },
        ],
      },
    ],
    active: 'd1',
    colors: { 'n4.text': { role: 'link' } },
  };
}

/**
 * Price box: a surface box with a 1 px frame and a 3 px accent line on top, padding 24 / 28 px.
 * Inside: the badge 16 px bold uppercase on the accent, 3 / 10 px padding, as wide as its text;
 * the old price 15 px dim, where only currency and amount are struck ("Was" stays readable, the
 * period is not repeated); the price 38 / 42 px bold with the currency 16 px raised in the accent
 * and the period 16 px dim after a space of the price size; details 14 / 22 px; fine print 13 / 20 px italic dim. Badge, old
 * price and price in the sans face. One box has one border, so two nested boxes draw the 2 px
 * accent line above the 1 px frame; the badge takes a quarter of the width, since a part has no
 * content width (model gaps, step 11). The currency is size `l` raised, which `sup` draws a sixth
 * smaller (about 17 px); the period has no light weight (normal).
 */
export function priceToParts(b: PriceBoxBlock): Converted {
  const strike = b.strikeEnabled && b.strikeAmount.trim();
  const label = b.strikeLabel.trim();
  const strikeDoc: RichInline[] = [
    ...(label ? [{ type: 'text' as const, text: `${b.strikeLabel} ` }] : []),
    { type: 'text', text: `${b.currency}${b.strikeAmount}`, marks: { strike: true } },
  ];
  const mainDoc: RichInline[] = [
    ...(b.currency ? [{ type: 'text' as const, text: b.currency, marks: { bold: true, sup: true, size: 'l' as const, color: 'accent' as const } }] : []),
    { type: 'text', text: b.amount, marks: { bold: true } },
    ...(b.periodLabel.trim()
      ? [
          { type: 'text' as const, text: ' ' },
          { type: 'text' as const, text: b.periodLabel, marks: { size: 's' as const, color: 'dim' as const } },
        ]
      : []),
  ];
  const parts: TextContent[] = [
    ...line('t1', 'badge', b.badge),
    ...(strike ? [{ id: 't2', kind: 'text' as const, role: 'small' as const, doc: [{ type: 'p' as const, children: strikeDoc }] }] : []),
    { id: 't3', kind: 'text', role: 'price', doc: [{ type: 'p', children: mainDoc }] },
    ...line('t4', 'body', b.details),
    ...line('t5', 'small', b.fine),
  ];
  const has = (id: string) => parts.some((p) => p.id === id);
  const inner: LayoutNode[] = [
    ...(has('t1')
      ? [
          {
            id: 'n3',
            kind: 'text' as const,
            part: 't1',
            bg: true,
            padV: space(3),
            padH: space(10),
            width: '1/4' as const,
            font: 'Helvetica' as const,
            size: textSize(16),
            weight: 'bold' as const,
            uppercase: true,
            lineHeight: 'tight' as const,
          },
          { id: 'n4', kind: 'spacer' as const, height: space(14) },
        ]
      : []),
    ...(has('t2')
      ? [
          { id: 'n5', kind: 'text' as const, part: 't2', font: 'Helvetica' as const, size: textSize(15) },
          { id: 'n6', kind: 'spacer' as const, height: space(4) },
        ]
      : []),
    { id: 'n7', kind: 'text', part: 't3', font: 'Helvetica', size: textSize(38), lineHeight: 'tight' },
    ...(has('t4')
      ? [
          { id: 'n8', kind: 'spacer' as const, height: space(6) },
          { id: 'n9', kind: 'text' as const, part: 't4', size: textSize(14) },
        ]
      : []),
    ...(has('t5')
      ? [
          { id: 'n10', kind: 'spacer' as const, height: space(10) },
          { id: 'n11', kind: 'text' as const, part: 't5', size: textSize(13), italic: true, lineHeight: 'loose' as const },
        ]
      : []),
  ];
  return {
    content: { parts, collections: [] },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(20) },
        children: [
          {
            id: 'n1',
            kind: 'box',
            border: border(3),
            borderSides: 'top',
            children: [{ id: 'n2', kind: 'box', bg: true, border: '1', padV: space(24), padH: space(28), children: inner }],
          },
        ],
      },
    ],
    active: 'd1',
    colors: { 'n1.border': { role: 'accent' }, 'n3.bg': { role: 'accent' }, 'n3.text': { role: 'surface' } },
  };
}
