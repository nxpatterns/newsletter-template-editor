import {
  compactDoc,
  emptyRichDoc,
  isRichColorToken,
  type RichColorToken,
  type RichDoc,
  type RichInline,
  type RichMarks,
  type RichParagraphNode,
  type RichSizeToken,
} from './model';
import { cleanPlainText } from './sanitize-text';

function parseColor(raw: string | null): RichColorToken | undefined {
  if (!raw) return undefined;
  const c = raw.trim().toLowerCase();
  // Named tokens if already classed
  if (isRichColorToken(c)) return c;
  // Hex / rgb rough map to nearest campaign roles (seed Glacier)
  const hex = c.startsWith('#') ? c : rgbToHex(c);
  if (!hex) return undefined;
  const map: Record<string, RichColorToken> = {
    '#7a9ab8': 'body',
    '#d8eeff': 'heading',
    '#d4d4d4': 'heading',
    '#ebf1fa': 'heading',
    '#7ecfff': 'accent',
    '#32bbff': 'accent',
    '#4db8ff': 'accent',
    '#f5c518': 'gold',
    '#4a6a88': 'dim',
  };
  if (map[hex]) return map[hex];
  // luminance heuristic
  const n = parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) return undefined;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const max = Math.max(r, g, b);
  if (max > 200 && b > r) return 'heading';
  if (b > 180 && g > 150) return 'accent';
  if (r > 200 && g > 150 && b < 80) return 'gold';
  return 'body';
}

function rgbToHex(css: string): string | null {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

function parseSize(px: string | null): RichSizeToken | undefined {
  if (!px) return undefined;
  const n = parseFloat(px);
  if (!Number.isFinite(n)) return undefined;
  if (n >= 24) return 'callout';
  if (n >= 19) return 'lead';
  if (n <= 12) return 'caption';
  if (n <= 14) return 'fine';
  return 'body';
}

function marksFromEl(el: HTMLElement, base: RichMarks = {}): RichMarks {
  const m: RichMarks = { ...base };
  const tag = el.tagName.toLowerCase();
  if (tag === 'strong' || tag === 'b') m.bold = true;
  if (tag === 'em' || tag === 'i') m.italic = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') m.strike = true;
  if (tag === 'sup') m.sup = true;
  if (tag === 'sub') m.sub = true;
  if (tag === 'a') {
    const href = (el.getAttribute('href') || '').trim();
    if (href && !/^javascript:/i.test(href)) {
      const t = el.getAttribute('target');
      m.link = { href, target: t === '_self' ? '_self' : '_blank' };
    }
  }

  const cls = el.className || '';
  for (const size of ['body', 'lead', 'callout', 'fine', 'caption'] as const) {
    if (cls.includes(`rt-size-${size}`) || cls.includes(`text-size-${size}`)) m.size = size;
  }
  for (const color of ['body', 'heading', 'accent', 'gold', 'dim'] as const) {
    if (cls.includes(`text-${color}`) && color !== 'body') m.color = color;
    if (cls.includes(`rt-color-${color}`)) m.color = color;
  }

  const style = el.getAttribute('style') || '';
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (colorMatch) {
    const tok = parseColor(colorMatch[1].trim());
    if (tok) m.color = tok;
  }
  const sizeMatch = style.match(/font-size\s*:\s*([\d.]+)px/i);
  if (sizeMatch) {
    const tok = parseSize(sizeMatch[1]);
    if (tok && tok !== 'body') m.size = tok;
  }
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) m.bold = true;
  if (/font-style\s*:\s*italic/i.test(style)) m.italic = true;
  if (/text-decoration[^;]*line-through/i.test(style)) m.strike = true;

  return m;
}

function walk(node: Node, marks: RichMarks, into: RichInline[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent ?? '';
    const text = cleanPlainText(raw);
    if (text) into.push({ type: 'text', text, marks: Object.keys(marks).length ? { ...marks } : undefined });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') {
    into.push({ type: 'br' });
    return;
  }
  if (tag === 'script' || tag === 'style') return;
  const next = marksFromEl(el, marks);
  el.childNodes.forEach((ch) => walk(ch, next, into));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function marksFromOpenTag(tag: string, attrStr: string, base: RichMarks): RichMarks {
  const m: RichMarks = { ...base };
  const t = tag.toLowerCase();
  if (t === 'strong' || t === 'b') m.bold = true;
  if (t === 'em' || t === 'i') m.italic = true;
  if (t === 's' || t === 'strike' || t === 'del') m.strike = true;
  if (t === 'sup') m.sup = true;
  if (t === 'sub') m.sub = true;
  if (t === 'a') {
    const hm = attrStr.match(/href\s*=\s*["']([^"']*)["']/i);
    const href = (hm?.[1] || '').trim();
    if (href && !/^javascript:/i.test(href)) {
      const tm = attrStr.match(/target\s*=\s*["']([^"']*)["']/i);
      m.link = { href, target: tm?.[1] === '_self' ? '_self' : '_blank' };
    }
  }
  const sm = attrStr.match(/style\s*=\s*["']([^"']*)["']/i);
  const style = sm?.[1] || '';
  const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
  if (colorMatch) {
    const tok = parseColor(colorMatch[1].trim());
    if (tok) m.color = tok;
  }
  const sizeMatch = style.match(/font-size\s*:\s*([\d.]+)px/i);
  if (sizeMatch) {
    const tok = parseSize(sizeMatch[1]);
    if (tok && tok !== 'body') m.size = tok;
  }
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) m.bold = true;
  if (/font-style\s*:\s*italic/i.test(style)) m.italic = true;
  const cm = attrStr.match(/class\s*=\s*["']([^"']*)["']/i);
  const cls = cm?.[1] || '';
  for (const size of ['lead', 'callout', 'fine', 'caption'] as const) {
    if (cls.includes(`rt-size-${size}`)) m.size = size;
  }
  for (const color of ['heading', 'accent', 'gold', 'dim'] as const) {
    if (cls.includes(`text-${color}`) || cls.includes(`rt-color-${color}`)) m.color = color;
  }
  return m;
}

/** Token scanner — works in Node tests without relying on DOMParser quirks. */
function richDocFromHtmlScan(html: string): RichDoc {
  const blocks: RichParagraphNode[] = [];
  let current: RichInline[] = [];
  const stack: RichMarks[] = [{}];
  let i = 0;
  const src = html;

  const flushParas = () => {
    if (!current.length) return;
    const chunks: RichInline[][] = [[]];
    let brRun = 0;
    for (const n of current) {
      if (n.type === 'br') {
        brRun += 1;
        if (brRun >= 2) {
          if (chunks[chunks.length - 1].length) chunks.push([]);
          brRun = 0;
        } else chunks[chunks.length - 1].push(n);
      } else {
        brRun = 0;
        chunks[chunks.length - 1].push(n);
      }
    }
    for (const ch of chunks) {
      const cleaned = ch.filter((x, idx, arr) => x.type !== 'br' || (idx > 0 && idx < arr.length - 1));
      if (cleaned.length) blocks.push({ type: 'p', children: cleaned });
    }
    current = [];
  };

  while (i < src.length) {
    if (src[i] === '<') {
      const end = src.indexOf('>', i);
      if (end < 0) break;
      const raw = src.slice(i + 1, end).trim();
      i = end + 1;
      if (!raw) continue;
      if (/^br\s*\/?$/i.test(raw)) {
        current.push({ type: 'br' });
        continue;
      }
      if (raw.startsWith('/')) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      const selfClosing = /\/$/.test(raw);
      const cleaned = raw.replace(/\/$/, '').trim();
      const sp = cleaned.search(/\s/);
      const tag = (sp < 0 ? cleaned : cleaned.slice(0, sp)).toLowerCase();
      const attrs = sp < 0 ? '' : cleaned.slice(sp);
      if (tag === 'p' || tag === 'div') {
        flushParas();
        stack.push(marksFromOpenTag(tag, attrs, stack[stack.length - 1] || {}));
        continue;
      }
      if (tag === 'script' || tag === 'style') {
        const close = src.toLowerCase().indexOf(`</${tag}`, i);
        i = close < 0 ? src.length : src.indexOf('>', close) + 1;
        continue;
      }
      if (!selfClosing) {
        stack.push(marksFromOpenTag(tag, attrs, stack[stack.length - 1] || {}));
      }
      continue;
    }
    const nextLt = src.indexOf('<', i);
    const chunk = nextLt < 0 ? src.slice(i) : src.slice(i, nextLt);
    i = nextLt < 0 ? src.length : nextLt;
    const text = cleanPlainText(decodeEntities(chunk));
    if (!text) continue;
    const marks = stack[stack.length - 1] || {};
    const markCopy = Object.keys(marks).length ? { ...marks } : undefined;
    current.push({ type: 'text', text, marks: markCopy });
  }
  flushParas();
  if (!blocks.length) {
    return emptyRichDoc(cleanPlainText(decodeEntities(html.replace(/<[^>]+>/g, ' '))));
  }
  return compactDoc(blocks);
}

/**
 * Convert legacy paragraph HTML (or plain text) into a rich doc.
 * Double `<br>` sequences become paragraph splits when reasonable.
 */
export function richDocFromHtml(html: string): RichDoc {
  const trimmed = (html ?? '').trim();
  if (!trimmed) return emptyRichDoc();

  // Plain text path
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    const plain = cleanPlainText(trimmed);
    const parts = plain.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
    if (!parts.length) return emptyRichDoc();
    return compactDoc(
      parts.map((text) => ({
        type: 'p' as const,
        children: [{ type: 'text' as const, text }],
      })),
    );
  }

  return richDocFromHtmlScan(trimmed);
}

export function ensureRichDoc(value: unknown): RichDoc {
  if (Array.isArray(value)) {
    try {
      return compactDoc(value as RichDoc);
    } catch {
      return emptyRichDoc();
    }
  }
  if (typeof value === 'string') return richDocFromHtml(value);
  return emptyRichDoc();
}
