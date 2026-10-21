import { createBlock, FRAME_PARTS, type Block } from '../../../core';
import { seedNewsletter } from '../../../core/seed';
import {
  blockSnippet,
  buildOverview,
  FRAME_PART_INFO,
  hasMissing,
  leafCount,
  OVERVIEW_FOOT,
  OVERVIEW_HEAD,
  OVERVIEW_LINKS,
  SNIPPET_MAX,
  shownLeafCount,
  type OverviewBlock,
  type OverviewPart,
} from './overview-tree';

function chapter(title: string): Block {
  const b = createBlock('chapter-band');
  return { ...b, title } as Block;
}

describe('overview tree', () => {
  const globals = seedNewsletter().globals;

  it('covers every header and footer part exactly once', () => {
    const listed = [...OVERVIEW_HEAD, ...OVERVIEW_FOOT, ...OVERVIEW_LINKS];
    expect([...listed].sort()).toEqual([...FRAME_PARTS].sort());
    for (const part of FRAME_PARTS) expect(FRAME_PART_INFO[part].route.length).toBeGreaterThan(0);
  });

  it('lists header and footer parts in mail order, links as their own branch', () => {
    const [head, , foot] = buildOverview([], globals);
    expect(head.children.map((c) => (c as OverviewPart).part)).toEqual([
      'starsTop',
      'brandName',
      'logo',
      'viewInBrowserTop',
    ]);
    expect(foot.children.map((c) => (c.kind === 'part' ? c.part : c.id))).toEqual([
      'notice',
      'social',
      'starsBottom',
      'company',
      'links',
    ]);
    const links = foot.children[4];
    expect(links.kind === 'links' && links.children.map((c) => c.part)).toEqual([
      'privacy',
      'imprint',
      'unsubscribe',
      'viewInBrowserBottom',
    ]);
  });

  it('groups blocks under the chapter before them and keeps mail positions', () => {
    const blocks = [
      createBlock('hero'),
      chapter('One'),
      createBlock('paragraph'),
      createBlock('divider'),
      chapter('Two'),
      createBlock('image'),
    ];
    const body = buildOverview(blocks, globals)[1];
    expect(body.children.map((c) => c.id)).toEqual([blocks[0].id, blocks[1].id, blocks[4].id]);
    const one = body.children[1] as OverviewBlock;
    expect(one.snippet).toBe('One');
    expect(one.children.map((c) => c.position)).toEqual([3, 4]);
    expect((body.children[2] as OverviewBlock).children.map((c) => c.position)).toEqual([6]);
    expect(leafCount(body)).toBe(6);
  });

  it('marks hidden parts and flags a hidden required part', () => {
    const [head, , foot] = buildOverview([], { ...globals, hiddenFrameParts: ['logo', 'imprint'] });
    const logo = head.children[2] as OverviewPart;
    expect(logo.shown).toBe(false);
    expect(logo.missing).toBe(false);
    expect(hasMissing(head)).toBe(false);
    expect(hasMissing(foot)).toBe(true);
    expect(shownLeafCount(foot)).toBe(leafCount(foot) - 1);
  });

  it('describes a block by its own words, without line breaks', () => {
    const hero = { ...createBlock('hero'), headline: 'Open\n  doors' } as Block;
    expect(blockSnippet(hero)).toBe('Open doors');
    expect(blockSnippet(createBlock('divider'))).toBe('');
    const long = {
      ...createBlock('chapter-band'),
      title: 'Eine von beiden Antworten kostet Sie Umsatz, und zwar jeden einzelnen Tag',
    } as Block;
    const snip = blockSnippet(long);
    expect(snip.length).toBeLessThanOrEqual(SNIPPET_MAX + 1);
    expect(snip.endsWith('…')).toBe(true);
    expect(snip.startsWith('Eine von beiden Antworten kostet Sie Umsatz')).toBe(true);
  });
});
