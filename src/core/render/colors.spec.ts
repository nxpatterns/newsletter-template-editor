import { setBlockColor, setColorMode, setGeneralColor, STANDARD_SETS } from '../colors';
import { seedNewsletter } from '../seed';
import type { Newsletter } from '../types';
import { renderExport, renderPreview } from './index';

function withStats(): Newsletter {
  const n = seedNewsletter();
  n.blocks = [
    { id: 's1', type: 'stat-box', number: '87 %', label: 'mehr', geo: '' } as never,
    { id: 's2', type: 'stat-box', number: '12', label: 'zwei', geo: '' } as never,
  ];
  return n;
}

describe('rendering the color sets', () => {
  it('uses no fixed CloudLib hex values in the stylesheet', () => {
    const css = renderExport(seedNewsletter()).full.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    const rules = css.replace(/:root\s*\{[^}]*\}/, '');
    expect(rules).not.toMatch(/#[0-9a-f]{6}\b/i);
  });

  it('follows a changed general color everywhere, including former fixed colors', () => {
    const n = seedNewsletter();
    n.globals.colors = setGeneralColor(n.globals.colors, 'btn', '#00aa11');
    n.globals.colors = setGeneralColor(n.globals.colors, 'surface', '#102030');
    const { full } = renderExport(n);
    expect(full).toContain('bgcolor="#00aa11"');
    expect(full).not.toContain('bgcolor="#1d6bb8"');
    expect(full).not.toContain('bgcolor="#060e1a"');
  });

  it('a color set in one block changes only that block', () => {
    const n = withStats();
    n.globals.colors = setBlockColor(n.globals.colors, 's1', 'number', { hex: '#ff0000' });
    const { body } = renderExport(n);
    const numbers = [...body.matchAll(/class="stat-number[^"]*"[^>]*style="([^"]*)"/g)].map((m) => m[1]);
    expect(numbers.length).toBe(2);
    expect(numbers[0]).toContain('#ff0000');
    expect(numbers[1]).not.toContain('#ff0000');
    expect(numbers[1].toLowerCase()).toContain(STANDARD_SETS.dark.link);
  });

  it('a block color also reaches the bgcolor attribute of its surface', () => {
    const n = withStats();
    n.globals.colors = setBlockColor(n.globals.colors, 's1', 'box', { hex: '#123456' });
    const { body } = renderExport(n);
    expect(body.match(/bgcolor="#123456"/g)?.length).toBe(1);
  });

  it('the light set renders independently and declares itself light only', () => {
    const n = withStats();
    n.globals.colors = setBlockColor(n.globals.colors, 's1', 'number', { hex: '#ff0000' });
    n.globals.colors = setColorMode(n.globals.colors, 'light');
    const { full } = renderExport(n);
    expect(full).toContain(`bgcolor="${STANDARD_SETS.light.page}"`);
    expect(full).not.toContain('#ff0000');
    expect(full).toContain('content="light only"');
    expect(renderPreview(n)).toContain('content="light only"');
  });

  it('keeps block colors inside the dark-scheme media query', () => {
    const n = withStats();
    n.globals.colors = setBlockColor(n.globals.colors, 's1', 'number', { hex: '#ff0000' });
    const media = renderExport(n).full.match(/@media \(prefers-color-scheme: dark\)[\s\S]*?\n  }\n/)?.[0] ?? '';
    expect(media).toMatch(/\.cb-s1 \.stat-number[^}]*#ff0000 !important/);
  });

  it('header and footer colors work like block colors', () => {
    const n = seedNewsletter();
    n.globals.colors = setBlockColor(n.globals.colors, 'footer', 'background', { hex: '#abcdef' });
    const { full } = renderExport(n);
    expect(full).toContain('bgcolor="#abcdef"');
  });
});

