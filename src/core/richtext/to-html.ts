import { escapeHtml } from '../render/utils';
import type { RichDoc, RichInline, RichMarks, RichParagraphNode } from './model';
import { normalizeMarks } from './model';
import { cleanPlainText, highlightSuspiciousHtml, isSuspiciousChar } from './sanitize-text';

function sizeClass(size?: string): string {
  if (!size || size === 'body') return '';
  return ` rt-size-${size}`;
}

function colorClass(color?: string, asBase = false): string {
  if (!color) return asBase ? ' text-body' : '';
  if (color === 'body') return ' text-body';
  if (color === 'heading') return ' text-heading';
  if (color === 'accent') return ' text-accent';
  if (color === 'gold') return ' text-gold';
  if (color === 'dim') return ' text-dim';
  return '';
}

function openMarks(m?: RichMarks): { open: string; close: string } {
  const marks = normalizeMarks(m);
  if (!marks) return { open: '', close: '' };
  const classes = `${sizeClass(marks.size)}${colorClass(marks.color)}`.trim();
  let open = '';
  let close = '';
  const push = (tag: string, attrs = '') => {
    open += `<${tag}${attrs}>`;
    close = `</${tag}>` + close;
  };
  if (classes) {
    push('span', ` class="${classes}"`);
  }
  if (marks.link?.href) {
    const target = marks.link.target === '_self' ? '_self' : '_blank';
    const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
    push('a', ` href="${escapeHtml(marks.link.href)}" target="${target}"${rel} class="rt-link text-accent"`);
  }
  if (marks.bold) push('strong');
  if (marks.italic) push('em');
  if (marks.strike) push('s');
  if (marks.sup) push('sup');
  if (marks.sub) push('sub');
  return { open, close };
}

function renderInlines(children: RichInline[], highlightSuspicious: boolean): string {
  return children
    .map((n) => {
      if (n.type === 'br') return '<br>';
      const text = cleanPlainText(n.text);
      const { open, close } = openMarks(n.marks);
      const body = highlightSuspicious
        ? highlightSuspiciousHtml(text, escapeHtml)
        : escapeHtml(text);
      return `${open}${body}${close}`;
    })
    .join('');
}

export interface RichHtmlOptions {
  /** data-field wrapper for inspector annotate (email preview). */
  dataField?: string;
  highlightSuspicious?: boolean;
  /** Editor mode adds contenteditable-friendly classes. */
  forEditor?: boolean;
}

/** Render rich doc to classed HTML fragment (one or more `<p class="paragraph-body">`). */
export function richDocToHtml(doc: RichDoc, opts: RichHtmlOptions = {}): string {
  const paragraphs = doc?.length ? doc : [{ type: 'p' as const, children: [{ type: 'text' as const, text: '' }] }];
  return paragraphs
    .map((p, index) => renderParagraph(p, index, opts))
    .join('\n');
}

function renderParagraph(p: RichParagraphNode, index: number, opts: RichHtmlOptions): string {
  const baseColor = colorClass(p.color, true).trim();
  const cls = ['paragraph-body', baseColor || 'text-body', opts.forEditor ? 'rt-p' : '']
    .filter(Boolean)
    .join(' ');
  const dataField =
    opts.dataField && index === 0 ? ` data-field="${opts.dataField}"` : '';
  const dataP = opts.forEditor ? ` data-rt-p="${index}"` : '';
  const colorAttr = p.color ? ` data-rt-color="${p.color}"` : '';
  const inner = renderInlines(p.children, !!opts.highlightSuspicious);
  return `<p class="${cls}"${dataField}${dataP}${colorAttr}>${inner || '<br>'}</p>`;
}

/** Flatten doc to plain string (for suspicious count / tests). */
export function richDocPlainText(doc: RichDoc): string {
  return (doc || [])
    .map((p) =>
      p.children
        .map((c) => (c.type === 'br' ? '\n' : c.text))
        .join(''),
    )
    .join('\n\n');
}

export function richDocSuspiciousCount(doc: RichDoc): number {
  let n = 0;
  for (const ch of richDocPlainText(doc)) {
    if (isSuspiciousChar(ch)) n += 1;
  }
  return n;
}
