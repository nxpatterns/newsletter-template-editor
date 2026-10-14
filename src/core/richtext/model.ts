/** Constrained paragraph lite rich-text model (JSON source of truth). */

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

/** Merge adjacent text spans with equal marks; drop empty text (keep structure). */
export function compactDoc(doc: RichDoc): RichDoc {
  const paragraphs = doc.length ? doc : emptyRichDoc();
  return paragraphs.map((p) => {
    const children: RichInline[] = [];
    for (const node of p.children) {
      if (node.type === 'br') {
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
    return {
      type: 'p' as const,
      color: p.color,
      children: children.length ? children : [{ type: 'text' as const, text: '' }],
    };
  });
}

export function clearMarksOnDoc(doc: RichDoc): RichDoc {
  return compactDoc(
    doc.map((p) => ({
      type: 'p',
      children: p.children.map((c) =>
        c.type === 'br' ? c : { type: 'text', text: c.text },
      ),
    })),
  );
}
