import { normalizeParagraphBlock, seedNewsletter } from '../index';
import { AI_WATERMARK_FIXTURE } from './fixtures/ai-watermark-sample';
import { richDocFromEditorRoot } from './from-editor-dom';
import { richDocFromHtml } from './from-html';
import {
  applyColorOnDoc,
  applyLinkOnDoc,
  applyParagraphBaseColorOnDoc,
  applySizeOnDoc,
  cleanAiCharsOnDoc,
  clearMarksOnDoc,
  compactDoc,
  plainTextToRichDoc,
  toggleMarkOnDoc,
  toggleMonoOnDoc,
  type RichDoc,
  type RichTextSpan,
} from './model';
import { cleanPlainText, countSuspiciousChars } from './sanitize-text';
import { richDocPlainText, richDocSuspiciousCount, richDocToHtml } from './to-html';

function textSpans(doc: RichDoc): RichTextSpan[] {
  return doc.flatMap((p) => p.children.filter((c): c is RichTextSpan => c.type === 'text'));
}

function spanWith(doc: RichDoc, exact: string): RichTextSpan | undefined {
  return textSpans(doc).find((t) => t.text === exact);
}

/** Phrase offsets in a single-paragraph plain string (spaces preserved). */
function rangeOf(haystack: string, needle: string): { start: number; end: number } {
  const start = haystack.indexOf(needle);
  if (start < 0) throw new Error(`missing "${needle}" in "${haystack}"`);
  return { start, end: start + needle.length };
}

describe('cleanPlainText', () => {
  it('strips zero-width and normalizes dashes', () => {
    const raw = `Hello\u200B\uFEFF world\u2014test\u00A0x`;
    expect(cleanPlainText(raw)).toBe('Hello world-test x');
    expect(countSuspiciousChars(raw)).toBeGreaterThan(0);
  });
});

describe('richDocFromHtml', () => {
  it('maps strong/em/br and splits double breaks', () => {
    const doc = richDocFromHtml(
      'Hello <strong>bold</strong> and <em>it</em>.<br><br>Second <span style="font-size:26px">call</span>',
    );
    expect(doc.length).toBe(2);
    const flat = doc[0].children.filter((c) => c.type === 'text');
    expect(flat.some((t) => t.type === 'text' && t.marks?.bold && t.text.includes('bold'))).toBe(
      true,
    );
    expect(flat.some((t) => t.type === 'text' && t.marks?.italic)).toBe(true);
    const call = doc[1].children.find((c) => c.type === 'text' && c.text.includes('call'));
    expect(call && call.type === 'text' && call.marks?.size).toBe('callout');
  });

  it('maps rgb accent-ish colors', () => {
    const doc = richDocFromHtml('<span style="color:rgb(50,187,255)">ice</span>');
    const t = doc[0].children[0];
    expect(t.type).toBe('text');
    if (t.type === 'text') expect(t.marks?.color).toBe('accent');
  });
});

describe('clearMarksOnDoc', () => {
  it('keeps links while dropping other marks and cleaning text', () => {
    const doc = clearMarksOnDoc([
      {
        type: 'p',
        color: 'accent',
        children: [
          {
            type: 'text',
            text: 'Hello\u200B',
            marks: {
              bold: true,
              color: 'gold',
              link: { href: 'https://cloudlib.eu', target: '_blank' },
            },
          },
        ],
      },
    ]);
    const t = doc[0].children[0];
    expect(doc[0].color).toBeUndefined();
    expect(t.type).toBe('text');
    if (t.type === 'text') {
      expect(t.text).toBe('Hello');
      expect(t.marks?.bold).toBeUndefined();
      expect(t.marks?.color).toBeUndefined();
      expect(t.marks?.link?.href).toBe('https://cloudlib.eu');
    }
  });
});

describe('cleanAiCharsOnDoc', () => {
  it('cleans text but preserves marks and links', () => {
    const raw = 'A\u200BB';
    const doc = cleanAiCharsOnDoc([
      {
        type: 'p',
        color: 'heading',
        children: [
          {
            type: 'text',
            text: raw,
            marks: { italic: true, link: { href: 'https://x.test' } },
          },
        ],
      },
    ]);
    expect(doc[0].color).toBe('heading');
    const t = doc[0].children[0];
    expect(t.type).toBe('text');
    if (t.type === 'text') {
      expect(t.text).toBe('AB');
      expect(t.marks?.italic).toBe(true);
      expect(t.marks?.link?.href).toBe('https://x.test');
    }
    expect(richDocSuspiciousCount(doc)).toBe(0);
  });

  it('does not invent blank paragraphs from the AI watermark fixture', () => {
    expect(countSuspiciousChars(AI_WATERMARK_FIXTURE)).toBeGreaterThan(0);
    const pasted = plainTextToRichDoc(AI_WATERMARK_FIXTURE);
    expect(richDocSuspiciousCount(pasted)).toBeGreaterThan(0);
    const cleaned = cleanAiCharsOnDoc(pasted);
    expect(richDocSuspiciousCount(cleaned)).toBe(0);
    // No empty paragraphs / br-only rows after clean.
    for (const p of cleaned) {
      expect(p.children.some((c) => c.type === 'text' && c.text.trim().length > 0)).toBe(true);
    }
    const plain = richDocPlainText(cleaned);
    // At most one blank line between blocks (no 3+ consecutive newlines).
    expect(plain).not.toMatch(/\n{3,}/);
    expect(plain).toMatch(/zerowidth/i);
    expect(plain).toMatch(/Notes:/i);
  });
});

describe('paragraph lite kit mark operations (toolbar functionality)', () => {
  const sample = 'Es ist die einzige internationale Plattform, die sichtbar macht.';

  it('bold toggles on and off without changing plain text or eating spaces', () => {
    const doc = plainTextToRichDoc(sample);
    const { start, end } = rangeOf(sample, 'internationale');
    const on = toggleMarkOnDoc(doc, start, end, 'bold');
    expect(spanWith(on, 'internationale')?.marks?.bold).toBe(true);
    expect(richDocPlainText(on)).toBe(sample);
    expect(richDocToHtml(on)).toContain('<strong>');

    const off = toggleMarkOnDoc(on, start, end, 'bold');
    expect(spanWith(off, 'internationale')?.marks?.bold).toBeUndefined();
    expect(richDocPlainText(off)).toBe(sample);
    expect(richDocToHtml(off)).not.toContain('<strong>');
  });

  it('italic toggles on and off', () => {
    const doc = plainTextToRichDoc(sample);
    const { start, end } = rangeOf(sample, 'sichtbar');
    const on = toggleMarkOnDoc(doc, start, end, 'italic');
    expect(spanWith(on, 'sichtbar')?.marks?.italic).toBe(true);
    expect(richDocToHtml(on)).toContain('<em>');
    const off = toggleMarkOnDoc(on, start, end, 'italic');
    expect(spanWith(off, 'sichtbar')?.marks?.italic).toBeUndefined();
  });

  it('strike toggles on and off', () => {
    const doc = plainTextToRichDoc(sample);
    const { start, end } = rangeOf(sample, 'Plattform');
    const on = toggleMarkOnDoc(doc, start, end, 'strike');
    expect(spanWith(on, 'Plattform')?.marks?.strike).toBe(true);
    expect(richDocToHtml(on)).toMatch(/<s>/);
    const off = toggleMarkOnDoc(on, start, end, 'strike');
    expect(spanWith(off, 'Plattform')?.marks?.strike).toBeUndefined();
  });

  it('superscript and subscript toggle and exclude each other', () => {
    const doc = plainTextToRichDoc('x2 and y2');
    const { start, end } = rangeOf('x2 and y2', '2');
    const sup = toggleMarkOnDoc(doc, start, end, 'sup');
    expect(spanWith(sup, '2')?.marks?.sup).toBe(true);
    expect(richDocToHtml(sup)).toContain('<sup>');

    const sub = toggleMarkOnDoc(sup, start, end, 'sub');
    expect(spanWith(sub, '2')?.marks?.sub).toBe(true);
    expect(spanWith(sub, '2')?.marks?.sup).toBeUndefined();
    expect(richDocToHtml(sub)).toContain('<sub>');
    expect(richDocToHtml(sub)).not.toContain('<sup>');
  });

  it('mono toggles on/off and never glues adjacent words (regression)', () => {
    const doc = plainTextToRichDoc(sample);
    const { start, end } = rangeOf(sample, 'internationale');
    const on = toggleMarkOnDoc(doc, start, end, 'mono');
    expect(spanWith(on, 'internationale')?.marks?.mono).toBe(true);
    expect(richDocPlainText(on)).toBe(sample);
    // Neighbor spaces must remain outside the mono span.
    expect(richDocToHtml(on, { forEditor: true })).toMatch(/rt-mono">internationale<\/code>/);
    expect(richDocToHtml(on, { forEditor: true })).not.toMatch(/internationale<\/code>Plattform/);

    const off = toggleMarkOnDoc(on, start, end, 'mono');
    expect(spanWith(off, 'internationale')?.marks?.mono).toBeUndefined();
    expect(richDocPlainText(off)).toBe(sample);
    expect(richDocToHtml(off, { forEditor: true })).not.toContain('rt-mono');

    // Alias still works.
    const alias = toggleMonoOnDoc(doc, start, end);
    expect(spanWith(alias, 'internationale')?.marks?.mono).toBe(true);
  });

  it('mono caret inside span toggles the whole span off', () => {
    const base = plainTextToRichDoc('aaa bbb ccc');
    const on = toggleMarkOnDoc(base, 4, 7, 'mono');
    const off = toggleMarkOnDoc(on, 5, 5, 'mono');
    expect(richDocToHtml(off, { forEditor: true })).not.toContain('rt-mono');
    expect(richDocPlainText(off)).toBe('aaa bbb ccc');
  });

  it('appearance size applies and body clears size without nesting', () => {
    const doc = plainTextToRichDoc(sample);
    const { start, end } = rangeOf(sample, 'internationale');
    const callout = applySizeOnDoc(doc, start, end, 'callout');
    expect(spanWith(callout, 'internationale')?.marks?.size).toBe('callout');
    expect(richDocToHtml(callout)).toContain('rt-size-callout');
    expect(richDocPlainText(callout)).toBe(sample);

    const lead = applySizeOnDoc(callout, start, end, 'lead');
    expect(spanWith(lead, 'internationale')?.marks?.size).toBe('lead');
    // Single size class after re-apply (no nested sizes in HTML).
    const html = richDocToHtml(lead);
    expect(html.match(/rt-size-/g)?.length).toBe(1);

    const body = applySizeOnDoc(lead, start, end, 'body');
    expect(spanWith(body, 'internationale')?.marks?.size).toBeUndefined();
  });

  it('span color applies primary/heading and body clears span color', () => {
    const doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'internationale');
    const colored = applyColorOnDoc(doc, r.start, r.end, 'heading');
    expect(spanWith(colored, 'internationale')?.marks?.color).toBe('heading');
    expect(richDocToHtml(colored)).toContain('text-heading');
    expect(richDocPlainText(colored)).toBe(sample);

    const cleared = applyColorOnDoc(colored, r.start, r.end, 'body');
    expect(spanWith(cleared, 'internationale')?.marks?.color).toBeUndefined();
  });

  it('paragraph base color applies at caret offset without wiping span marks', () => {
    let doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'sichtbar');
    doc = applyColorOnDoc(doc, r.start, r.end, 'accent');
    doc = applyParagraphBaseColorOnDoc(doc, 0, 'heading');
    expect(doc[0].color).toBe('heading');
    expect(spanWith(doc, 'sichtbar')?.marks?.color).toBe('accent');
    expect(richDocPlainText(doc)).toBe(sample);
  });

  it('link apply and strip keep label text and reject javascript hrefs', () => {
    const doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'Plattform');
    const linked = applyLinkOnDoc(doc, r.start, r.end, 'cloudlib.eu', '_blank');
    const s = spanWith(linked, 'Plattform');
    expect(s?.marks?.link?.href).toBe('https://cloudlib.eu');
    expect(s?.marks?.link?.target).toBe('_blank');
    expect(richDocToHtml(linked)).toContain('rt-link');
    expect(richDocPlainText(linked)).toBe(sample);

    const stripped = applyLinkOnDoc(linked, r.start, r.end, '');
    expect(spanWith(stripped, 'Plattform')?.marks?.link).toBeUndefined();

    const evil = applyLinkOnDoc(doc, r.start, r.end, 'javascript:alert(1)');
    expect(spanWith(evil, 'Plattform')?.marks?.link).toBeUndefined();
  });

  it('clear formatting drops styles but keeps links and plain text', () => {
    let doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'internationale');
    doc = toggleMarkOnDoc(doc, r.start, r.end, 'bold');
    doc = toggleMarkOnDoc(doc, r.start, r.end, 'mono');
    doc = applySizeOnDoc(doc, r.start, r.end, 'callout');
    doc = applyColorOnDoc(doc, r.start, r.end, 'gold');
    doc = applyLinkOnDoc(doc, r.start, r.end, 'https://cloudlib.eu');
    const cleared = clearMarksOnDoc(doc);
    const s = spanWith(cleared, 'internationale');
    expect(s?.marks?.bold).toBeUndefined();
    expect(s?.marks?.mono).toBeUndefined();
    expect(s?.marks?.size).toBeUndefined();
    expect(s?.marks?.color).toBeUndefined();
    expect(s?.marks?.link?.href).toBe('https://cloudlib.eu');
    expect(richDocPlainText(cleared)).toBe(sample);
  });

  it('stacked marks survive round-trip through editor HTML', () => {
    let doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'internationale');
    doc = toggleMarkOnDoc(doc, r.start, r.end, 'bold');
    doc = toggleMarkOnDoc(doc, r.start, r.end, 'italic');
    doc = applySizeOnDoc(doc, r.start, r.end, 'callout');
    doc = applyColorOnDoc(doc, r.start, r.end, 'heading');
    const html = richDocToHtml(doc, { forEditor: true });
    const root = document.createElement('div');
    root.innerHTML = html;
    const again = richDocFromEditorRoot(root);
    const s = spanWith(again, 'internationale');
    expect(s?.marks?.bold).toBe(true);
    expect(s?.marks?.italic).toBe(true);
    expect(s?.marks?.size).toBe('callout');
    expect(s?.marks?.color).toBe('heading');
    expect(richDocPlainText(again)).toBe(sample);
  });

  it('second mono toggle after editor round-trip still removes mono (no glue)', () => {
    let doc = plainTextToRichDoc(sample);
    const r = rangeOf(sample, 'internationale');
    doc = toggleMarkOnDoc(doc, r.start, r.end, 'mono');
    const root = document.createElement('div');
    root.innerHTML = richDocToHtml(doc, { forEditor: true });
    const fromDom = richDocFromEditorRoot(root);
    const off = toggleMarkOnDoc(fromDom, r.start, r.end, 'mono');
    expect(richDocToHtml(off, { forEditor: true })).not.toContain('rt-mono');
    expect(richDocPlainText(off)).toBe(sample);
    expect(richDocPlainText(off)).toContain('internationale Plattform');
  });
});

describe('compactDoc', () => {
  it('drops empty paragraphs and collapses br runs', () => {
    const doc = compactDoc([
      { type: 'p', children: [{ type: 'text', text: 'A' }] },
      { type: 'p', children: [{ type: 'br' }] },
      { type: 'p', children: [{ type: 'text', text: '' }] },
      {
        type: 'p',
        children: [
          { type: 'text', text: 'B' },
          { type: 'br' },
          { type: 'br' },
          { type: 'br' },
          { type: 'text', text: 'C' },
        ],
      },
    ]);
    expect(doc.length).toBe(2);
    const second = doc[1].children.filter((c) => c.type === 'br');
    expect(second.length).toBe(1);
  });
});

describe('editor DOM round-trip after AI clean', () => {
  it('repaint stays free of empty gap paragraphs', () => {
    const pasted = plainTextToRichDoc(AI_WATERMARK_FIXTURE);
    const cleaned = cleanAiCharsOnDoc(pasted);
    const html = richDocToHtml(cleaned, { forEditor: true });
    const root = document.createElement('div');
    root.innerHTML = html;
    const again = richDocFromEditorRoot(root);
    expect(again.length).toBe(cleaned.length);
    expect(richDocPlainText(again)).not.toMatch(/\n{3,}/);
    expect(richDocSuspiciousCount(again)).toBe(0);
  });
});

describe('richDocToHtml', () => {
  it('emits classed paragraphs and bold', () => {
    const html = richDocToHtml([
      {
        type: 'p',
        children: [
          { type: 'text', text: 'A ' },
          { type: 'text', text: 'B', marks: { bold: true, size: 'callout' } },
        ],
      },
    ]);
    expect(html).toContain('paragraph-body');
    expect(html).toContain('<strong>');
    expect(html).toContain('rt-size-callout');
  });
});

describe('normalizeParagraphBlock', () => {
  it('migrates legacy html field', () => {
    const b = normalizeParagraphBlock({
      id: 'p1',
      html: '<strong>cloudlib</strong> rocks',
    });
    expect(b.type).toBe('paragraph');
    expect(b.body[0].children.some((c) => c.type === 'text' && c.marks?.bold)).toBe(true);
    expect('html' in b).toBe(false);
  });
});

describe('seed paragraphs', () => {
  it('normalize seed yields body docs without raw html field', () => {
    const n = seedNewsletter();
    const paras = n.blocks.filter((b) => b.type === 'paragraph');
    expect(paras.length).toBeGreaterThan(0);
    for (const p of paras) {
      if (p.type !== 'paragraph') continue;
      expect(Array.isArray(p.body)).toBe(true);
      expect(p.body[0].type).toBe('p');
    }
    const html = n.blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) => (b.type === 'paragraph' ? richDocToHtml(b.body) : ''))
      .join('');
    expect(html).toMatch(/cloudlib|Betrieb|Google/i);
  });
});
