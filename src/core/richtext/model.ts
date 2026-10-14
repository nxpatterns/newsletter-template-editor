/** Constrained paragraph lite rich-text model (JSON source of truth). */

import { cleanPlainText } from './sanitize-text';

export const RICH_SIZE_TOKENS = ['body', 'lead', 'callout', 'fine', 'caption'] as const;
export type RichSizeToken = (typeof RICH_SIZE_TOKENS)[number];

/** Theme color slots usable as span/paragraph base color (no free hex). */
export const RICH_COLOR_TOKENS = ['body', 'heading', 'accent', 'gold', 'dim'] as const;
export type RichColorToken = (typeof RICH_COLOR_TOKENS)[number];

export type RichLinkTarget = '_blank' | '_self';

export interface RichLinkMark {
  href: string;
  target?: RichLinkTarget;
}

export interface RichMarks {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  sup?: boolean;
  sub?: boolean;
  /** Monospace / code face. */
  mono?: boolean;
  size?: RichSizeToken;
  color?: RichColorToken;
  link?: RichLinkMark;
}

export interface RichTextSpan {
  type: 'text';
  text: string;
  marks?: RichMarks;
}

export interface RichBreak {
  type: 'br';
}

export type RichInline = RichTextSpan | RichBreak;

export interface RichParagraphNode {
  type: 'p';
  /** Base color for unmarked text in this paragraph (theme token). */
  color?: RichColorToken;
  children: RichInline[];
}

export type RichDoc = RichParagraphNode[];

export function emptyRichDoc(text = ''): RichDoc {
  return [
    {
      type: 'p',
      children: text ? [{ type: 'text', text }] : [{ type: 'text', text: '' }],
    },
  ];
}

export function isRichSizeToken(v: unknown): v is RichSizeToken {
  return typeof v === 'string' && (RICH_SIZE_TOKENS as readonly string[]).includes(v);
}

export function isRichColorToken(v: unknown): v is RichColorToken {
  return typeof v === 'string' && (RICH_COLOR_TOKENS as readonly string[]).includes(v);
}

export function marksEqual(a?: RichMarks, b?: RichMarks): boolean {
  return JSON.stringify(normalizeMarks(a)) === JSON.stringify(normalizeMarks(b));
}

export function normalizeMarks(m?: RichMarks): RichMarks | undefined {
  if (!m) return undefined;
  const out: RichMarks = {};
  if (m.bold) out.bold = true;
  if (m.italic) out.italic = true;
  if (m.strike) out.strike = true;
  if (m.sup) out.sup = true;
  if (m.sub) out.sub = true;
  if (m.mono) out.mono = true;
  if (m.size && m.size !== 'body') out.size = m.size;
  if (m.color) out.color = m.color;
  if (m.link?.href?.trim()) {
    out.link = {
      href: m.link.href.trim(),
      target: m.link.target === '_self' ? '_self' : '_blank',
    };
  }
  return Object.keys(out).length ? out : undefined;
}

function paragraphHasVisibleText(p: RichParagraphNode): boolean {
  return p.children.some((c) => c.type === 'text' && c.text.trim().length > 0);
}

/** Merge adjacent equal marks; collapse br runs; drop empty paragraphs. */
export function compactDoc(doc: RichDoc): RichDoc {
  const paragraphs = doc.length ? doc : emptyRichDoc();
  const mapped = paragraphs.map((p) => {
    const children: RichInline[] = [];
    for (const node of p.children) {
      if (node.type === 'br') {
        // Drop leading brs and collapse consecutive brs to one soft break.
        if (!children.length) continue;
        if (children[children.length - 1]?.type === 'br') continue;
        children.push({ type: 'br' });
        continue;
      }
      const text = node.text;
      if (!text) continue;
      const marks = normalizeMarks(node.marks);
      const prev = children[children.length - 1];
      if (prev && prev.type === 'text' && marksEqual(prev.marks, marks)) {
        prev.text += text;
      } else {
        children.push({ type: 'text', text, marks });
      }
    }
    while (children.length && children[children.length - 1]?.type === 'br') {
      children.pop();
    }
    return {
      type: 'p' as const,
      color: p.color,
      children: children.length ? children : [{ type: 'text' as const, text: '' }],
    };
  });
  // Empty <p><br></p> rows (from paste / browser block splits) must not survive —
  // they render as multi-line gaps after clean/repaint.
  const nonEmpty = mapped.filter(paragraphHasVisibleText);
  return nonEmpty.length ? nonEmpty : emptyRichDoc();
}

/**
 * Build a RichDoc from plain clipboard/fixture text.
 * Double newlines → paragraphs; single newlines → soft breaks; 3+ newlines collapse.
 */
export function plainTextToRichDoc(input: string): RichDoc {
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const collapsed = normalized.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
  if (!collapsed.trim()) return emptyRichDoc();
  const blocks = collapsed.split(/\n\n+/);
  return compactDoc(
    blocks.map((block) => {
      const lines = block.split('\n');
      const children: RichInline[] = [];
      lines.forEach((line, i) => {
        if (line) children.push({ type: 'text', text: line });
        if (i < lines.length - 1) children.push({ type: 'br' });
      });
      return {
        type: 'p' as const,
        children: children.length ? children : [{ type: 'text' as const, text: '' }],
      };
    }),
  );
}

/**
 * Clear formatting: drop style marks and paragraph base color, clean AI junk.
 * **Keeps links** (href + target).
 */
export function clearMarksOnDoc(doc: RichDoc): RichDoc {
  return compactDoc(
    doc.map((p) => ({
      type: 'p' as const,
      children: p.children.map((c) => {
        if (c.type === 'br') return c;
        const link = c.marks?.link;
        return {
          type: 'text' as const,
          text: cleanPlainText(c.text),
          marks: link?.href ? normalizeMarks({ link }) : undefined,
        };
      }),
    })),
  );
}

/** Strip AI/invisible characters from text nodes; preserve all marks and links. */
export function cleanAiCharsOnDoc(doc: RichDoc): RichDoc {
  return compactDoc(
    doc.map((p) => ({
      type: 'p' as const,
      color: p.color,
      children: p.children.map((c) =>
        c.type === 'br'
          ? c
          : { type: 'text' as const, text: cleanPlainText(c.text), marks: normalizeMarks(c.marks) },
      ),
    })),
  );
}
