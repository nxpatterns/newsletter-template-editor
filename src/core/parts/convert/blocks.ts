import type { ChapterBandBlock, CtaButtonBlock, HeroBlock, PullQuoteBlock } from '../../types';
import type { FreeBlockData } from '../model';
import { border, plainDoc, space, textSize } from './snap';

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
