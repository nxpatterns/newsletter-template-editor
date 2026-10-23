import type { RichInline } from '../../richtext/model';
import { BENEFIT_DEFAULT_ICON, type BenefitsListBlock, type CtaLinkListBlock } from '../../types';
import type { Converted } from '.';
import { iconSize, plainDoc, space, textSize } from './snap';

/**
 * Benefits list: one row per item, 14 px above and below, a hairline under every row; block
 * padding 20 / 48 px. The glyph 14 px in the link color, 3 px down, in a 25 px column; the text
 * 16 / 21.6 px in the heading color. The glyph is an `s` icon (16 px), at the top of its line
 * without the 3 px, in a column as wide as the icon and 16 px before the text.
 */
export function benefitsToParts(b: BenefitsListBlock): Converted {
  return {
    content: {
      parts: [],
      collections: [
        {
          id: 'l1',
          items: b.items.map((item, i) => ({
            id: `it${i + 1}`,
            parts: [
              { id: 'g1', kind: 'icon', role: 'icon', glyph: item.icon?.trim() || BENEFIT_DEFAULT_ICON },
              { id: 't1', kind: 'text', role: 'body', doc: plainDoc(item.text) },
            ],
          })),
        },
      ],
    },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(20) },
        children: [
          {
            id: 'n1',
            kind: 'list',
            collection: 'l1',
            gap: '0',
            item: [
              {
                id: 'n2',
                kind: 'box',
                padV: space(14),
                border: '1',
                borderSides: 'bottom',
                children: [
                  {
                    id: 'n3',
                    kind: 'columns',
                    ratio: '1:3',
                    gap: space(16),
                    valign: 'top',
                    stack: false,
                    columns: [
                      { id: 'c1', fit: true, children: [{ id: 'n4', kind: 'icon', part: 'g1', size: iconSize(14) }] },
                      { id: 'c2', children: [{ id: 'n5', kind: 'text', part: 't1', size: textSize(16), lineHeight: 'tight' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    active: 'd1',
    colors: { 'n5.text': { role: 'head' } },
  };
}

/**
 * CTA link list: one dim line 14 / 24 px per item: the glyph in the link color 8 px before the
 * bold label in the body color, the intro, then the underlined link. Rows 14 px apart with a
 * hairline between them, none above the first and below the last; block padding 20 / 48 px.
 * The glyph is an `s` icon (16 px) in a column as wide as the icon and 16 px before the text, like
 * the Benefits list, so every text starts at the same place whatever the glyph's width
 * (maintainer, 2026-10-23); the old inline glyph moved the text by its width. A list part repeats one item design, so every item gets its
 * padding and its line: the block padding takes 8 px, which with the item's 12 px keeps 20 px at
 * the top, and the last item keeps its line (model gap, step 11). The link is not underlined and
 * not tracked (model gaps, steps 5 and 11).
 */
export function ctaLinksToParts(b: CtaLinkListBlock): Converted {
  const doc = (item: CtaLinkListBlock['items'][number]): RichInline[] => [
    ...(item.label ? [{ type: 'text' as const, text: item.label, marks: { bold: true, color: 'body' as const } }] : []),
    { type: 'text', text: item.intro ? ` ${item.intro} ` : ' ' },
    ...(item.linkText && item.href.trim() ? [{ type: 'text' as const, text: item.linkText, marks: { link: { href: item.href } } }] : []),
  ];
  return {
    content: {
      parts: [],
      collections: [
        {
          id: 'l1',
          items: b.items.map((item, i) => ({
            id: `it${i + 1}`,
            parts: [
              { id: 'g1', kind: 'icon', role: 'icon', glyph: item.icon || '→' },
              { id: 't1', kind: 'text', role: 'body', doc: [{ type: 'p', color: 'dim', children: doc(item) }] },
            ],
          })),
        },
      ],
    },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(8) },
        children: [
          {
            id: 'n1',
            kind: 'list',
            collection: 'l1',
            gap: '0',
            item: [
              {
                id: 'n2',
                kind: 'box',
                padV: space(14),
                border: '1',
                borderSides: 'bottom',
                children: [
                  {
                    id: 'n3',
                    kind: 'columns',
                    ratio: '1:3',
                    gap: space(16),
                    valign: 'top',
                    stack: false,
                    columns: [
                      { id: 'c1', fit: true, children: [{ id: 'n4', kind: 'icon', part: 'g1', size: iconSize(14) }] },
                      { id: 'c2', children: [{ id: 'n5', kind: 'text', part: 't1', size: textSize(14), lineHeight: 'loose' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    active: 'd1',
  };
}
