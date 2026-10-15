import {
  compactDoc,
  emptyRichDoc,
  isRichColorToken,
  isRichSizeToken,
  type RichColorToken,
  type RichDoc,
  type RichInline,
  type RichMarks,
  type RichParagraphNode,
} from './model';
import { preserveEditorText } from './sanitize-text';

function marksFromClassList(el: HTMLElement, base: RichMarks = {}): RichMarks {
  const m: RichMarks = { ...base };
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' ? el.className : '';
  if (tag === 'strong' || tag === 'b') m.bold = true;
  if (tag === 'em' || tag === 'i') m.italic = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') m.strike = true;
  if (tag === 'sup') m.sup = true;
  if (tag === 'sub') m.sub = true;
  if (tag === 'code' || cls.includes('rt-mono')) m.mono = true;
  if (tag === 'a') {
    const href = (el.getAttribute('href') || '').trim();
    if (href && !/^javascript:/i.test(href)) {
      m.link = {
        href,
        target: el.getAttribute('target') === '_self' ? '_self' : '_blank',
      };
    }
  }
  for (const size of ['l', 'xl', 's', 'xs', 'm'] as const) {
    if (cls.includes(`rt-size-${size}`)) m.size = size === 'm' ? undefined : size;
  }
  for (const color of ['primary', 'secondary', 'accent', 'dim', 'standard'] as const) {
    if (cls.includes(`text-${color}`) || cls.includes(`rt-color-${color}`)) {
      if (isRichColorToken(color)) m.color = color === 'standard' ? undefined : color;
    }
  }
  const dataColor = el.getAttribute('data-rt-color');
  if (dataColor && isRichColorToken(dataColor)) m.color = dataColor;
  const dataSize = el.getAttribute('data-rt-size');
  if (dataSize && isRichSizeToken(dataSize) && dataSize !== 'm') m.size = dataSize;
  return m;
}

function walk(node: Node, marks: RichMarks, into: RichInline[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = preserveEditorText(node.textContent ?? '');
    if (text) {
      into.push({
        type: 'text',
        text,
        marks: Object.keys(marks).length ? { ...marks } : undefined,
      });
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.getAttribute('data-suspicious') === '1') {
    // unwrap highlight chrome
    el.childNodes.forEach((ch) => walk(ch, marks, into));
    return;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') {
    into.push({ type: 'br' });
    return;
  }
  if (tag === 'script' || tag === 'style') return;
  const next = marksFromClassList(el, marks);
  el.childNodes.forEach((ch) => walk(ch, next, into));
}

/** Serialize contenteditable root (div.rt-editor) back to RichDoc. */
export function richDocFromEditorRoot(root: HTMLElement): RichDoc {
  const blocks: RichParagraphNode[] = [];
  const paragraphs = Array.from(root.querySelectorAll(':scope > p'));
  if (!paragraphs.length) {
    const inlines: RichInline[] = [];
    root.childNodes.forEach((ch) => walk(ch, {}, inlines));
    if (!inlines.length) return emptyRichDoc();
    return compactDoc([{ type: 'p', children: inlines }]);
  }
  for (const p of paragraphs) {
    const inlines: RichInline[] = [];
    const colorAttr = p.getAttribute('data-rt-color');
    const color =
      colorAttr && isRichColorToken(colorAttr) ? (colorAttr as RichColorToken) : undefined;
    p.childNodes.forEach((ch) => walk(ch, {}, inlines));
    blocks.push({
      type: 'p',
      color,
      children: inlines.length ? inlines : [{ type: 'text', text: '' }],
    });
  }
  return compactDoc(blocks.length ? blocks : emptyRichDoc());
}
