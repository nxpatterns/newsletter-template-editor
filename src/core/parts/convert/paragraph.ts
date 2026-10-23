import type { ParagraphBlock } from '../../types';
import type { FreeBlockData } from '../model';

/** Paragraph: one body text over the whole width; 17 / 30 px of the built-in is `m` + `loose`. */
export function paragraphToParts(b: ParagraphBlock): FreeBlockData {
  return {
    content: { parts: [{ id: 't1', kind: 'text', role: 'body', doc: structuredClone(b.body) }], collections: [] },
    designs: [{ id: 'd1', name: '', style: {}, children: [{ id: 'n1', kind: 'text', part: 't1', lineHeight: 'loose' }] }],
    active: 'd1',
  };
}
