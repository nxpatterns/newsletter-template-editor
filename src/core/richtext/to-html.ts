import { escapeHtml } from '../render/utils';
import type { RichDoc, RichInline, RichMarks, RichParagraphNode } from './model';
import { normalizeMarks } from './model';
import { cleanPlainText, highlightSuspiciousHtml, isSuspiciousChar } from './sanitize-text';

function sizeClass(size?: string): string {
  if (!size || size === 'm') return '';
  return ` rt-size-${size}`;
}

function colorClass(color?: string, asBase = false): string {
  if (!color) return asBase ? ' text-standard' : '';
  if (color === 'standard') return ' text-standard';
  if (color === 'primary') return ' text-primary';
  if (color === 'secondary') return ' text-secondary';
  if (color === 'accent') return ' text-accent';
  if (color === 'dim') return ' text-dim';
  return '';
}

function openMarks(
  m: RichMarks | undefined,
  opts: { forEditor?: boolean },
): { open: string; close: string } {
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
    // Editor: dual-write data-rt-* so Info mode and toolbar apply paths match seed HTML.
    let attrs = ` class="${classes}"`;
    if (opts.forEditor) {
      if (marks.size && marks.size !== 'm') attrs += ` data-rt-size="${marks.size}"`;
      if (marks.color && marks.color !== 'standard') attrs += ` data-rt-color="${marks.color}"`;
    }
    push('span', attrs);
  }
  if (marks.link?.href) {
    const target = marks.link.target === '_self' ? '_self' : '_blank';
    const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
    push('a', ` href="${escapeHtml(marks.link.href)}" target="${target}"${rel} class="rt-link text-secondary"`);
  }
  if (marks.bold) push('strong');
  if (marks.italic) push('em');
  if (marks.strike) push('s');
  if (marks.sup) push('sup');
  if (marks.sub) push('sub');
  if (marks.mono) push('code', ' class="rt-mono"');
  return { open, close };
}

function renderInlines(
  children: RichInline[],
  opts: { highlightSuspicious?: boolean; forEditor?: boolean; cleanExport?: boolean },
): string {
  return children
    .map((n) => {
      if (n.type === 'br') return '<br>';
      // Editor keeps raw (incl. watermarks); export/preview email cleans.
      const text = opts.forEditor
        ? n.text
        : opts.cleanExport !== false
          ? cleanPlainText(n.text)
          : n.text;
      const { open, close } = openMarks(n.marks, { forEditor: !!opts.forEditor });
      const body = opts.highlightSuspicious
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
  /** When false, skip cleanPlainText (default true for mail render). */
  cleanExport?: boolean;
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
  const cls = ['paragraph-body', baseColor || 'text-standard', opts.forEditor ? 'rt-p' : '']
    .filter(Boolean)
    .join(' ');
  const dataField =
    opts.dataField && index === 0 ? ` data-field="${opts.dataField}"` : '';
  const dataP = opts.forEditor ? ` data-rt-p="${index}"` : '';
  const colorAttr = p.color ? ` data-rt-color="${p.color}"` : '';
  const inner = renderInlines(p.children, {
    highlightSuspicious: !!opts.highlightSuspicious,
    forEditor: !!opts.forEditor,
    cleanExport: opts.cleanExport,
  });
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
