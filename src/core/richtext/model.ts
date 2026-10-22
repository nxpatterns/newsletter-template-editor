/** Constrained paragraph lite rich-text model (JSON source of truth). */

import { cleanPlainText } from './sanitize-text';

/** T-shirt sizes, smallest to largest; `m` is the normal text size. */
export const RICH_SIZE_TOKENS = ['xs', 's', 'm', 'l', 'xl'] as const;
export type RichSizeToken = (typeof RICH_SIZE_TOKENS)[number];

/** Theme color slots usable as span/paragraph base color (no free hex). */
export const RICH_COLOR_TOKENS = ['body', 'head', 'link', 'accent', 'dim'] as const;
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

/**
 * "Name or fallback" piece (decision 80): with a real name it reads "{lead} {name}", otherwise the
 * fallback, e.g. "Guten Tag Alex Berger" or "Werte Geschäftspartner". A name that is an email
 * address or a role mailbox counts as no name. Zero length for text offsets: the editor shows it
 * as a chip whose label is no text node.
 */
export interface RichNamePiece {
  type: 'name';
  /** Words before the name, only shown with a name. */
  lead: string;
  fallback: string;
  marks?: RichMarks;
}

export type RichInline = RichTextSpan | RichBreak | RichNamePiece;

export function isNamePiece(n: RichInline): n is RichNamePiece {
  return n.type === 'name';
}

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
  if (m.size && m.size !== 'm') out.size = m.size;
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
  return p.children.some((c) => (c.type === 'text' && c.text.trim().length > 0) || c.type === 'name');
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
      if (node.type === 'name') {
        const lead = typeof node.lead === 'string' ? node.lead : '';
        const fallback = typeof node.fallback === 'string' ? node.fallback : '';
        children.push({ type: 'name', lead, fallback, marks: normalizeMarks(node.marks) });
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
        if (c.type === 'name') return { ...c, marks: undefined };
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
        c.type !== 'text'
          ? c
          : { type: 'text' as const, text: cleanPlainText(c.text), marks: normalizeMarks(c.marks) },
      ),
    })),
  );
}

/** Boolean inline marks toggleable on a plain-text range. */
export type RichToggleMark = 'bold' | 'italic' | 'strike' | 'sup' | 'sub' | 'mono';

type SpanHit = { spanStart: number; spanEnd: number; has: boolean };

/** Resolve [start,end) against text-only offsets; expand caret to enclosing span. */
function resolveTextRange(
  doc: RichDoc,
  start: number,
  end: number,
  hasMark: (m?: RichMarks) => boolean,
): { a: number; b: number; hits: SpanHit[] } | null {
  let a = Math.max(0, Math.min(start, end));
  let b = Math.max(0, Math.max(start, end));
  const hits: SpanHit[] = [];
  let pos = 0;
  for (const p of doc) {
    for (const ch of p.children) {
      if (ch.type !== 'text') continue;
      const spanStart = pos;
      const spanEnd = pos + ch.text.length;
      hits.push({ spanStart, spanEnd, has: hasMark(ch.marks) });
      pos = spanEnd;
    }
  }
  if (!hits.length) return null;
  if (a === b) {
    const hit =
      hits.find((h) => a >= h.spanStart && a < h.spanEnd) ??
      hits.find((h) => a === h.spanEnd) ??
      hits[hits.length - 1];
    if (!hit) return null;
    a = hit.spanStart;
    b = hit.spanEnd;
  }
  if (a === b) return null;
  return { a, b, hits };
}

function mapRangeSpans(
  doc: RichDoc,
  a: number,
  b: number,
  applyMid: (base: RichMarks) => RichMarks | undefined,
): RichDoc {
  const next: RichDoc = doc.map((p) => ({
    type: 'p' as const,
    color: p.color,
    children: p.children.map((ch) =>
      ch.type !== 'text' ? ch : { type: 'text' as const, text: ch.text, marks: normalizeMarks(ch.marks) },
    ),
  }));

  let pos = 0;
  for (const p of next) {
    const newChildren: RichInline[] = [];
    for (const ch of p.children) {
      if (ch.type !== 'text') {
        newChildren.push(ch);
        continue;
      }
      const spanStart = pos;
      const spanEnd = pos + ch.text.length;
      pos = spanEnd;
      const lo = Math.max(a, spanStart);
      const hi = Math.min(b, spanEnd);
      if (hi <= lo) {
        newChildren.push(ch);
        continue;
      }
      const localLo = lo - spanStart;
      const localHi = hi - spanStart;
      const before = ch.text.slice(0, localLo);
      const mid = ch.text.slice(localLo, localHi);
      const after = ch.text.slice(localHi);
      const base = normalizeMarks(ch.marks) ?? {};
      if (before) newChildren.push({ type: 'text', text: before, marks: normalizeMarks(base) });
      if (mid) {
        newChildren.push({
          type: 'text',
          text: mid,
          marks: normalizeMarks(applyMid({ ...base })),
        });
      }
      if (after) newChildren.push({ type: 'text', text: after, marks: normalizeMarks(base) });
    }
    p.children = newChildren.length ? newChildren : [{ type: 'text', text: '' }];
  }
  return compactDoc(next);
}

/**
 * Toggle a boolean mark on [start, end) plain-text offsets (text nodes only —
 * same as contenteditable TreeWalker SHOW_TEXT / selection bookmarks).
 * If every covered character already has the mark → turn off; otherwise on.
 * Collapsed range: toggle the whole text span containing the caret.
 */
export function toggleMarkOnDoc(
  doc: RichDoc,
  start: number,
  end: number,
  mark: RichToggleMark,
): RichDoc {
  const resolved = resolveTextRange(doc, start, end, (m) => !!m?.[mark]);
  if (!resolved) return doc;
  const { a, b, hits } = resolved;

  let covered = 0;
  let marked = 0;
  for (const h of hits) {
    const lo = Math.max(a, h.spanStart);
    const hi = Math.min(b, h.spanEnd);
    if (hi <= lo) continue;
    const n = hi - lo;
    covered += n;
    if (h.has) marked += n;
  }
  if (covered === 0) return doc;
  const turnOn = marked < covered;

  return mapRangeSpans(doc, a, b, (base) => {
    const marks: RichMarks = { ...base };
    if (turnOn) marks[mark] = true;
    else delete marks[mark];
    // sup/sub are mutually exclusive in the lite kit.
    if (turnOn && mark === 'sup') delete marks.sub;
    if (turnOn && mark === 'sub') delete marks.sup;
    return marks;
  });
}

/** @deprecated use toggleMarkOnDoc(doc, start, end, 'mono') */
export function toggleMonoOnDoc(doc: RichDoc, start: number, end: number): RichDoc {
  return toggleMarkOnDoc(doc, start, end, 'mono');
}

/** Apply semantic size on range (body clears size mark). Preserves other marks. */
export function applySizeOnDoc(
  doc: RichDoc,
  start: number,
  end: number,
  size: RichSizeToken,
): RichDoc {
  const resolved = resolveTextRange(doc, start, end, () => false);
  if (!resolved) return doc;
  const { a, b } = resolved;
  return mapRangeSpans(doc, a, b, (base) => {
    const marks: RichMarks = { ...base };
    if (!size || size === 'm') delete marks.size;
    else marks.size = size;
    return marks;
  });
}

/** Apply span theme color on range (body clears span color). */
export function applyColorOnDoc(
  doc: RichDoc,
  start: number,
  end: number,
  color: RichColorToken,
): RichDoc {
  const resolved = resolveTextRange(doc, start, end, () => false);
  if (!resolved) return doc;
  const { a, b } = resolved;
  return mapRangeSpans(doc, a, b, (base) => {
    const marks: RichMarks = { ...base };
    if (!color || color === 'body') delete marks.color;
    else marks.color = color;
    return marks;
  });
}

/** Set paragraph base color by plain-text offset (paragraph containing `at`). */
export function applyParagraphBaseColorOnDoc(
  doc: RichDoc,
  at: number,
  color: RichColorToken | '',
): RichDoc {
  let pos = 0;
  let target = 0;
  for (let pi = 0; pi < doc.length; pi++) {
    const p = doc[pi];
    const start = pos;
    for (const ch of p.children) {
      if (ch.type !== 'text') continue;
      pos += ch.text.length;
    }
    const end = pos;
    if (at >= start && at <= end) {
      target = pi;
      break;
    }
    target = pi;
  }
  return compactDoc(
    doc.map((p, pi) => ({
      type: 'p' as const,
      color: pi === target ? (color && color !== 'body' ? color : undefined) : p.color,
      children: p.children,
    })),
  );
}

/** Apply / replace link on range; empty href strips link. Label text unchanged. */
export function applyLinkOnDoc(
  doc: RichDoc,
  start: number,
  end: number,
  href: string,
  target: RichLinkTarget = '_blank',
): RichDoc {
  const resolved = resolveTextRange(doc, start, end, () => false);
  if (!resolved) return doc;
  const { a, b } = resolved;
  const clean = href.trim();
  if (!clean || /^javascript:/i.test(clean)) {
    return mapRangeSpans(doc, a, b, (base) => {
      const marks: RichMarks = { ...base };
      delete marks.link;
      return marks;
    });
  }
  const normalized =
    clean.includes('://') || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('#')
      ? clean
      : `https://${clean}`;
  return mapRangeSpans(doc, a, b, (base) => ({
    ...base,
    link: { href: normalized, target: target === '_self' ? '_self' : '_blank' },
  }));
}
