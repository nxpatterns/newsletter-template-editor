import type { RichDoc } from '../../richtext/model';
import { buildLinkHref } from '../../richtext/link-target';
import type { ContactBlock, TestimonialBlock } from '../../types';
import type { ContentPart, FreeBlockData, LayoutNode, TextContent } from '../model';
import { plainDoc, space, textSize } from './snap';

/** A one-line text part, or nothing when the field is empty. */
function line(id: string, role: TextContent['role'], text: string, doc: RichDoc = plainDoc(text)): TextContent[] {
  return text.trim() ? [{ id, kind: 'text', role, doc }] : [];
}

/** A text linked to the address the old renderer builds for it (`tel:`, `mailto:`); plain when it builds none. */
function linkDoc(text: string, href: string | null): RichDoc {
  return [{ type: 'p', children: [{ type: 'text', text, ...(href ? { marks: { link: { href } } } : {}) }] }];
}

/**
 * Testimonial: 22 / 34 px italic quote, centered, 18 px above the byline; padding 20 / 48 px.
 * Byline: name 15 / 22 px bold, role 13 / 20 px dim, centered. With a picture they sit beside a
 * 44 px round photo or a 36 px high logo, 12 px apart, the pair centered by its content width:
 * the columns get a share of the width instead (photo `1:3` of a half, logo `1:2` of three
 * quarters) and the picture a share of its column, since an image has no px size or height and
 * a column no content width (model gaps, step 11).
 */
export function testimonialToParts(b: TestimonialBlock): FreeBlockData {
  const mode = b.imageMode !== 'none' && b.src.trim() ? b.imageMode : 'none';
  const by = [...line('t2', 'name', b.name), ...line('t3', 'small', b.role)];
  const pic: ContentPart[] = mode === 'none' ? [] : [{ id: 'i1', kind: 'image', role: mode, src: b.src, alt: b.alt, href: '' }];
  const align = mode === 'none' ? ('center' as const) : ('left' as const);
  const texts: LayoutNode[] = by.map((p) =>
    p.id === 't2'
      ? { id: 'n4', kind: 'text', part: 't2', size: textSize(15), weight: 'bold', lineHeight: 'normal', align }
      : { id: 'n5', kind: 'text', part: 't3', size: textSize(13), lineHeight: 'normal', align },
  );
  let byline: LayoutNode[] = texts;
  if (mode !== 'none') {
    const photo = mode === 'photo';
    byline = [
      {
        id: 'n3',
        kind: 'columns',
        ratio: photo ? '1:3' : '1:2',
        gap: space(12),
        valign: 'middle',
        stack: false,
        width: photo ? '1/2' : '3/4',
        align: 'center',
        columns: [
          { id: 'c1', children: [{ id: 'n6', kind: 'image', part: 'i1', ...(photo ? { width: '2/3' as const, radius: 'round' as const } : {}) }] },
          { id: 'c2', children: texts },
        ],
      },
    ];
  }
  return {
    content: { parts: [{ id: 't1', kind: 'text', role: 'quote', doc: plainDoc(b.quote) }, ...pic, ...by], collections: [] },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(20) },
        children: [
          { id: 'n1', kind: 'text', part: 't1', size: textSize(22), italic: true, lineHeight: 'normal', align: 'center' },
          { id: 'n2', kind: 'spacer', height: space(18) },
          ...byline,
        ],
      },
    ],
    active: 'd1',
  };
}

/**
 * Contact: a hairline on top, 18 px below it the 72 px round photo (20 px gap) beside the details,
 * both in the middle; on phones the photo stacks on top. Details: intro and role 14 / 21 px dim,
 * name 17 / 24 px bold (2 px above snap to 0), 6 px after the role, phone and email 15 / 23 px
 * linked, then 12 px and a filled button. Padding 24 / 48 px. The photo column takes `1:3` and
 * the photo half of it (66 px), since a column has no content width and an image no px size; the
 * links are not underlined (model gaps, step 11).
 */
export function contactToParts(b: ContactBlock): FreeBlockData {
  const photo = b.src.trim();
  const button = b.buttonLabel.trim() && b.href.trim();
  const parts: ContentPart[] = [
    ...(photo ? [{ id: 'i1', kind: 'image' as const, role: 'photo' as const, src: b.src, alt: b.alt, href: '' }] : []),
    ...line('t1', 'small', b.intro),
    ...line('t2', 'name', b.name),
    ...line('t3', 'small', b.role),
    ...line('t4', 'body', b.phone, linkDoc(b.phone, buildLinkHref('phone', b.phone))),
    ...line('t5', 'body', b.email, linkDoc(b.email, buildLinkHref('email', b.email))),
    ...(button ? [{ id: 'b1', kind: 'button' as const, role: 'cta' as const, text: b.buttonLabel, href: b.href }] : []),
  ];
  const has = (id: string) => parts.some((p) => p.id === id);
  const info: LayoutNode[] = [
    ...(has('t1') ? [{ id: 'n4', kind: 'text' as const, part: 't1', size: textSize(14), lineHeight: 'normal' as const }] : []),
    ...(has('t2') ? [{ id: 'n5', kind: 'text' as const, part: 't2', size: textSize(17), weight: 'bold' as const, lineHeight: 'normal' as const }] : []),
    ...(has('t3')
      ? [
          { id: 'n6', kind: 'text' as const, part: 't3', size: textSize(14), lineHeight: 'normal' as const },
          { id: 'n7', kind: 'spacer' as const, height: space(6) },
        ]
      : []),
    ...(has('t4') ? [{ id: 'n8', kind: 'text' as const, part: 't4', size: textSize(15), lineHeight: 'normal' as const }] : []),
    ...(has('t5') ? [{ id: 'n9', kind: 'text' as const, part: 't5', size: textSize(15), lineHeight: 'normal' as const }] : []),
    ...(button
      ? [
          { id: 'n10', kind: 'spacer' as const, height: space(12) },
          { id: 'n11', kind: 'button' as const, part: 'b1', variant: 'filled' as const, size: 'm' as const },
        ]
      : []),
  ];
  const row: LayoutNode[] = photo
    ? [
        {
          id: 'n3',
          kind: 'columns',
          ratio: '1:3',
          gap: space(20),
          valign: 'middle',
          columns: [
            { id: 'c1', children: [{ id: 'n12', kind: 'image', part: 'i1', width: '1/2', radius: 'round' }] },
            { id: 'c2', children: info },
          ],
        },
      ]
    : info;
  return {
    content: { parts, collections: [] },
    designs: [
      {
        id: 'd1',
        name: '',
        style: { padV: space(24) },
        children: [{ id: 'n1', kind: 'divider', line: 'solid', thickness: '1' }, { id: 'n2', kind: 'spacer', height: space(18) }, ...row],
      },
    ],
    active: 'd1',
  };
}
