import { describe, expect, it } from 'vitest';
import { defaultGlobals } from '../../brand/defaults';
import { renderExport } from '../../render';
import { CURRENT_SCHEMA_VERSION, type Block, type Newsletter } from '../../types';
import { compareTextsAndLinks, exportTextsAndLinks, toFreeBlock } from '.';
import { GATE_SAMPLES } from './samples';

const body = (block: Block): string => {
  const doc: Newsletter = { schemaVersion: CURRENT_SCHEMA_VERSION, globals: defaultGlobals(), blocks: [block] };
  return renderExport(doc).body;
};

describe('gate converters', () => {
  it.each(GATE_SAMPLES.map((s) => [s.name, s] as const))('%s: the parts export shows the same texts and links', (_, s) => {
    const free = toFreeBlock(s.block);
    expect(free?.type).toBe('free');
    expect(compareTextsAndLinks(body(s.block), body(free!))).toEqual([]);
  });

  it('has no converter for the greeting, which stays built-in', () => {
    expect(toFreeBlock({ id: 'e', type: 'greeting' } as never)).toBeNull();
  });

  it('reports a changed text and a changed link', () => {
    const a = '<p>Hi <a href="https://a.eu">there</a></p>';
    expect(compareTextsAndLinks(a, a)).toEqual([]);
    expect(compareTextsAndLinks(a, '<p>Hi <a href="https://b.eu">there</a></p>')).toHaveLength(1);
    expect(compareTextsAndLinks(a, '<p>Ho <a href="https://a.eu">there</a></p>')).toHaveLength(1);
  });

  it('ignores styles and decodes entities', () => {
    expect(exportTextsAndLinks('<style>p{}</style><p>A &amp; B&nbsp;C</p>').text).toBe('A & B C');
  });
});
