import { describe, expect, it } from 'vitest';
import { defaultGlobals } from '../../brand/defaults';
import { renderExport } from '../../render';
import { CURRENT_SCHEMA_VERSION, type Block, type Newsletter } from '../../types';
import { compareTextsAndLinks, convertBlock, exportTextsAndLinks, toFreeBlock } from '.';
import { GATE_SAMPLES } from './samples';
import { border, space, textSize } from './snap';

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

  it('keeps the color of a whole paragraph', () => {
    const block: Block = { id: 'p', type: 'paragraph', body: [{ type: 'p', color: 'dim', children: [{ type: 'text', text: 'Dim' }] }] };
    expect(body(toFreeBlock(block as never)!)).toMatch(/<span class="text-dim"[^>]*>Dim<\/span>/);
  });

  it('binds a divider on the page background and its two-tone marks to their roles', () => {
    expect(convertBlock({ id: 'd', type: 'divider', style: 'two-tone', background: 'page' })?.colors).toEqual({
      'n2.line': { role: 'btn' },
      'n3.line': { role: 'link' },
      background: { role: 'page' },
    });
  });

  it('keeps a divider slot color through the export inliner', () => {
    const c = convertBlock({ id: 'd', type: 'divider', style: 'two-tone', background: 'content' })!;
    const globals = defaultGlobals();
    for (const set of [globals.colors.light, globals.colors.dark]) set.blocks['d'] = c.colors;
    const html = renderExport({ schemaVersion: CURRENT_SCHEMA_VERSION, globals, blocks: [c.block] }).body;
    expect(html).toMatch(/class="fp-divider[^"]*" style="[^"]*border-top-color: #1d6bb8/);
    expect(html).not.toMatch(/class="fp-divider[^"]*" style="[^"]*border-top: /);
  });

  it('centers a small image in the export and lets a stacked full width image fill the phone width', () => {
    const small = body(toFreeBlock({ id: 'i', type: 'image', src: 'https://x.eu/a.png', alt: 'A', href: '', caption: '', width: 'small' })!);
    expect(small).toMatch(/<img[^>]*width="252"[^>]*class="fp-img fp-img-center"[^>]*style="[^"]*margin: 0 auto/);
    const left = body(
      toFreeBlock({ id: 't', type: 'image-text', src: 'https://x.eu/a.png', alt: 'A', href: '', body: [], side: 'left', imageWidth: 'third', valign: 'top' })!,
    );
    expect(left).toMatch(/class="fp-img fp-img-fill"/);
  });

  it('puts the image first in the source for an image on the right, so it lands on top on phones', () => {
    const html = body(
      toFreeBlock({ id: 't', type: 'image-text', src: 'https://x.eu/a.png', alt: 'A', href: '', body: [], side: 'right', imageWidth: 'half', valign: 'middle' })!,
    );
    expect(html).toMatch(/class="fp-cols" dir="rtl"/);
    expect(html.indexOf('<img')).toBeLessThan(html.lastIndexOf('fp-col'));
  });

  it('snaps off-scale px to the nearest step, a tie to the smaller one', () => {
    expect([space(52), space(20), space(28), textSize(22), textSize(13), border(3)]).toEqual(['2xl', 'm', 'l', 'l', 'xs', '2']);
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
