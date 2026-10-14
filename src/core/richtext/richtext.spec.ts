import { normalizeParagraphBlock, seedNewsletter } from '../index';
import { richDocFromHtml } from './from-html';
import { cleanPlainText, countSuspiciousChars } from './sanitize-text';
import { richDocToHtml } from './to-html';

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
