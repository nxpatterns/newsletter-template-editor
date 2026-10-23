import type { SlotColor } from '../../colors/model';
import type { ChapterBandBlock, CtaButtonBlock, DividerBlock, DividerStyle, HeroBlock, PullQuoteBlock } from '../../types';
import type { DividerNode, FreeBlockData, LayoutNode } from '../model';
import { border, iconSize, plainDoc, space, textSize } from './snap';
import type { Converted } from '.';

type DividerThickness = NonNullable<DividerNode['thickness']>;

/** Hero: 14 px label with 2 px tracking (no line height set: tight), 28 px gap, 26 px italic headline; padding 52 / 48 px. */
export function heroToParts(b: HeroBlock): FreeBlockData {
  return {
    content: {
      parts: [
        { id: 't1', kind: 'text', role: 'label', doc: plainDoc(b.label) },
        { id: 't2', kind: 'text', role: 'headline', doc: plainDoc(b.headline) },
      ],
      collections: [],
    },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(52) },
        children: [
          { id: 'n1', kind: 'text', part: 't1', size: textSize(14), letterSpacing: 'wider', lineHeight: 'tight' },
          { id: 'n2', kind: 'spacer', height: space(28) },
          { id: 'n3', kind: 'text', part: 't2', size: textSize(26), italic: true, weight: 'normal', lineHeight: 'tight' },
        ],
      },
    ],
    active: 'd1',
  };
}

/** Chapter band: a full width surface band, 16 / 48 px padding, 14 px title with 2 px tracking. */
export function chapterToParts(b: ChapterBandBlock): FreeBlockData {
  return {
    content: { parts: [{ id: 't1', kind: 'text', role: 'label', doc: plainDoc(b.title) }], collections: [] },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: '0' },
        children: [
          {
            id: 'n1',
            kind: 'section',
            bleed: 'full',
            bg: true,
            padV: space(16),
            padH: space(48),
            children: [{ id: 'n2', kind: 'text', part: 't1', size: textSize(14), letterSpacing: 'wider', lineHeight: 'tight' }],
          },
        ],
      },
    ],
    active: 'd1',
  };
}

/** Pull quote: 3 px side bar, 16 / 22 px inset, 22 / 34 px italic quote; padding 20 / 48 px. */
export function quoteToParts(b: PullQuoteBlock): FreeBlockData {
  return {
    content: { parts: [{ id: 't1', kind: 'text', role: 'quote', doc: plainDoc(b.quote) }], collections: [] },
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
            borderSides: 'left',
            padV: space(16),
            padH: space(22),
            children: [{ id: 'n2', kind: 'text', part: 't1', size: textSize(22), italic: true, lineHeight: 'normal' }],
          },
        ],
      },
    ],
    active: 'd1',
  };
}

/** CTA button: one filled button on the left; padding 24 / 48 px. */
export function ctaToParts(b: CtaButtonBlock): FreeBlockData {
  return {
    content: { parts: [{ id: 'b1', kind: 'button', role: 'cta', text: b.text, href: b.href }], collections: [] },
    designs: [{ id: 'd1', name: '', style: {}, children: [{ id: 'n1', kind: 'button', part: 'b1', variant: 'filled', size: 'm' }] }],
    active: 'd1',
  };
}

/** Thin and two-tone sit on the row edge; ornament and glow get 10 px above and below. */
function dividerChildren(b: DividerBlock): LayoutNode[] {
  switch (b.style) {
    case 'thin':
      return [{ id: 'n1', kind: 'divider', line: 'solid', thickness: '1' }];
    case 'two-tone':
      // 80 and 120 px of 3 px on the right: the right third, split 1:2.
      return [
        {
          id: 'n1',
          kind: 'columns',
          ratio: '1:2',
          gap: '0',
          stack: false,
          width: '1/3',
          align: 'right',
          columns: [
            { id: 'c1', children: [{ id: 'n2', kind: 'divider', thickness: border(3) as DividerThickness }] },
            { id: 'c2', children: [{ id: 'n3', kind: 'divider', thickness: border(3) as DividerThickness }] },
          ],
        },
      ];
    case 'ornament':
      // Hairline, 40 px glyph cell, hairline: the ratio scale has no content-sized column, so thirds.
      return [
        {
          id: 'n1',
          kind: 'columns',
          ratio: '1:1:1',
          gap: '0',
          stack: false,
          valign: 'middle',
          columns: [
            { id: 'c1', children: [{ id: 'n2', kind: 'divider', thickness: '1' }] },
            { id: 'c2', children: [{ id: 'n3', kind: 'icon', part: 'i1', size: iconSize(12), align: 'center' }] },
            { id: 'c3', children: [{ id: 'n4', kind: 'divider', thickness: '1' }] },
          ],
        },
      ];
    case 'glow':
      // Seven steps from the background to the tone: only the full tone steps in the middle third.
      return [{ id: 'n1', kind: 'divider', thickness: '2', width: '1/3', align: 'center' }];
    case 'spacer-only':
      return [{ id: 'n1', kind: 'spacer', height: space(Math.max(1, b.heightPx ?? 24)) }];
  }
}

/** Divider colors by role; the ornament hairlines and the glow steps mix tone and background in the old renderer. */
const DIVIDER_COLORS: Readonly<Record<DividerStyle, Record<string, SlotColor>>> = {
  thin: {},
  'two-tone': { 'n2.line': { role: 'btn' }, 'n3.line': { role: 'link' } },
  ornament: { 'n3.icon': { role: 'accent' } },
  glow: { 'n1.line': { role: 'link' } },
  'spacer-only': {},
};

/** Divider: full row width, no side padding; on the content or the page background. */
export function dividerToParts(b: DividerBlock): Converted {
  const spaced = b.style === 'ornament' || b.style === 'glow';
  return {
    content: { parts: b.style === 'ornament' ? [{ id: 'i1', kind: 'icon', role: 'icon', glyph: '◆' }] : [], collections: [] },
    designs: [{ id: 'd1', name: '', style: { padV: spaced ? space(10) : '0', padH: '0' }, children: dividerChildren(b) }],
    active: 'd1',
    colors: { ...DIVIDER_COLORS[b.style], ...(b.background === 'page' ? { background: { role: 'page' } } : {}) },
  };
}
