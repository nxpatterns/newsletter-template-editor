import { normalizeParagraphBlock, seedNewsletter } from '../index';
import { AI_WATERMARK_FIXTURE } from './fixtures/ai-watermark-sample';
import { richDocFromEditorRoot } from './from-editor-dom';
import { richDocFromHtml } from './from-html';
import {
  cleanAiCharsOnDoc,
  clearMarksOnDoc,
  compactDoc,
  plainTextToRichDoc,
} from './model';
import { cleanPlainText, countSuspiciousChars } from './sanitize-text';
import { richDocPlainText, richDocSuspiciousCount, richDocToHtml } from './to-html';

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
