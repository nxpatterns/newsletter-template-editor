/**
 * Gate comparison (decisions 84 to 86): renders the export of every gate sample twice, with the
 * built-in renderer and as parts, takes screenshots at 600 and 320 px in Light and Dark and
 * writes one side by side overview page. The only automatic check is equal texts and links.
 *
 *   npm run gate:compare -- [out dir]   (default: docs/sessions/cache/screenshots/gate-comparison)
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { defaultGlobals } from '../../src/core/brand/defaults';
import { compareTextsAndLinks, toFreeBlock } from '../../src/core/parts/convert';
import { GATE_SAMPLES } from '../../src/core/parts/convert/samples';
import { renderExport } from '../../src/core/render';
import { CURRENT_SCHEMA_VERSION, type Block, type Newsletter } from '../../src/core/types';

// The export inliner parses with the browser DOM.
const dom = new JSDOM('');
Object.assign(globalThis, { DOMParser: dom.window.DOMParser, Node: dom.window.Node, Element: dom.window.Element });

const WIDTHS = [600, 320] as const;
const SCHEMES = ['light', 'dark'] as const;

const out = resolve(process.argv[2] ?? 'docs/sessions/cache/screenshots/gate-comparison');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'shots'), { recursive: true });

const exportOf = (block: Block) => {
  const doc: Newsletter = { schemaVersion: CURRENT_SCHEMA_VERSION, globals: defaultGlobals(), blocks: [block] };
  return renderExport(doc);
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch();
const sections: string[] = [];
let failures = 0;

for (const sample of GATE_SAMPLES) {
  const free = toFreeBlock(sample.block);
  if (!free) throw new Error(`No converter for ${sample.block.type}`);
  const sides = { old: exportOf(sample.block), parts: exportOf(free) };
  const diffs = compareTextsAndLinks(sides.old.body, sides.parts.body);
  if (diffs.length) failures++;
  const id = slug(sample.name);
  const rows: string[] = [];
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      const cells: string[] = [];
      for (const side of ['old', 'parts'] as const) {
        const file = `shots/${id}--${width}--${scheme}--${side}.png`;
        const page = await browser.newPage({ viewport: { width, height: 400 }, colorScheme: scheme, reducedMotion: 'reduce' });
        await page.setContent(sides[side].full, { waitUntil: 'load' });
        await page.screenshot({ path: join(out, file), fullPage: true });
        await page.close();
        cells.push(`<figure><figcaption>${side === 'old' ? 'Old renderer' : 'Parts'}</figcaption><img src="${file}" width="${width}" alt=""></figure>`);
      }
      rows.push(`<h3>${width} px, ${scheme === 'light' ? 'Light' : 'Dark'}</h3><div class="pair">${cells.join('')}</div>`);
    }
  }
  const check = diffs.length
    ? `<pre class="bad">${esc(diffs.join('\n\n'))}</pre>`
    : '<p class="ok">Texts and links are equal.</p>';
  sections.push(`<section id="${id}"><h2>${esc(sample.name)} <small>${esc(sample.block.type)}</small></h2>${check}${rows.join('')}</section>`);
  console.log(`${diffs.length ? 'DIFF' : 'ok  '}  ${sample.name}${diffs.length ? `\n${diffs.join('\n')}` : ''}`);
}
await browser.close();

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gate comparison</title>
<style>
  :root { color-scheme: light; --bg: #f4f5f7; --fg: #1c2330; --dim: #5b6575; --line: #d7dbe2; --ok: #1d7a46; --bad: #b42318; }
  body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 22px; } h2 { margin: 40px 0 8px; font-size: 18px; } h2 small { color: var(--dim); font-weight: 400; }
  h3 { margin: 20px 0 8px; font-size: 14px; color: var(--dim); font-weight: 600; }
  nav a { margin-right: 12px; } .ok { color: var(--ok); } .bad { color: var(--bad); white-space: pre-wrap; }
  .pair { display: flex; gap: 16px; align-items: flex-start; overflow-x: auto; }
  figure { margin: 0; } figcaption { font-size: 12px; color: var(--dim); margin-bottom: 4px; }
  img { display: block; border: 1px solid var(--line); height: auto; }
</style></head><body>
<h1>Gate comparison</h1>
<p>Export of each block, old renderer left, parts right. Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. ${failures ? `<strong class="bad">${failures} sample(s) with different texts or links.</strong>` : '<span class="ok">All texts and links equal.</span>'}</p>
<nav>${GATE_SAMPLES.map((s) => `<a href="#${slug(s.name)}">${esc(s.name)}</a>`).join('')}</nav>
${sections.join('\n')}
</body></html>`;
writeFileSync(join(out, 'index.html'), page);
console.log(`\nOverview: ${join(out, 'index.html')}`);
process.exitCode = failures ? 1 : 0;
