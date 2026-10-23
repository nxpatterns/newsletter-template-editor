import type { ImageBlock, ImageTextBlock } from '../../types';
import type { FreeBlockData, LayoutNode } from '../model';
import { plainDoc, space, textSize } from './snap';

/** Caption: 12 / 18 px italic, dim, centered like the old cell (`align="center"`), 8 px below the image. */
function caption(text: string, full: boolean): LayoutNode[] {
  if (!text.trim()) return [];
  return [
    { id: 'n2', kind: 'spacer', height: space(8) },
    // Full width: the caption keeps the 48 px side margin and 12 px below.
    { id: 'n3', kind: 'text', part: 't1', size: textSize(12), italic: true, lineHeight: 'normal', align: 'center', ...(full ? { padH: space(48) } : {}) },
    ...(full ? [{ id: 'n4', kind: 'spacer' as const, height: space(12) }] : []),
  ];
}

/** Image: full row without padding, the text column with 12 / 48 px, or half of the text column, centered. */
export function imageToParts(b: ImageBlock): FreeBlockData {
  const full = b.width === 'full';
  return {
    content: {
      parts: [
        { id: 'i1', kind: 'image', role: 'image', src: b.src, alt: b.alt, href: b.href },
        ...(b.caption.trim() ? [{ id: 't1', kind: 'text' as const, role: 'small' as const, doc: plainDoc(b.caption) }] : []),
      ],
      collections: [],
    },
    designs: [
      {
        id: 'd1',
        name: '',
        style: full ? { padV: '0', padH: '0' } : { padV: space(12) },
        children: [
          { id: 'n1', kind: 'image', part: 'i1', align: 'center', ...(b.width === 'small' ? { width: '1/2' as const } : {}) },
          ...caption(b.caption, full),
        ],
      },
    ],
    active: 'd1',
  };
}

/**
 * Image and text: ⅓ (160 of 504 px) is `1:2`, ½ is `1:1`; the 20 px gutter snaps to 16 px, which is
 * also the old 16 px between image and text on phones. The image sits first in the source either
 * way, so it lands on top on phones: an image on the right is a reversed row.
 */
export function imageTextToParts(b: ImageTextBlock): FreeBlockData {
  const right = b.side === 'right';
  const pic = { id: 'c1', children: [{ id: 'n2', kind: 'image' as const, part: 'i1' }] };
  const copy = { id: 'c2', children: [{ id: 'n3', kind: 'text' as const, part: 't1', lineHeight: 'loose' as const }] };
  const half = b.imageWidth === 'half';
  return {
    content: {
      parts: [
        { id: 'i1', kind: 'image', role: 'image', src: b.src, alt: b.alt, href: b.href },
        { id: 't1', kind: 'text', role: 'body', doc: structuredClone(b.body) },
      ],
      collections: [],
    },
    designs: [
      {
        id: 'd1',
        name: '',
        style: {},
        children: [
          {
            id: 'n1',
            kind: 'columns',
            ratio: half ? '1:1' : right ? '2:1' : '1:2',
            gap: space(20),
            valign: b.valign,
            ...(right ? { reversed: true } : {}),
            columns: right ? [copy, pic] : [pic, copy],
          },
        ],
      },
    ],
    active: 'd1',
  };
}
