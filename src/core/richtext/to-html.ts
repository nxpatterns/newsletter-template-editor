import { escapeHtml } from '../render/utils';
import type { RichDoc, RichInline, RichMarks, RichNamePiece, RichParagraphNode } from './model';
import { namePieceText, nameTemplate } from './name-piece';
import { normalizeMarks } from './model';
import { cleanPlainText, highlightSuspiciousHtml, isSuspiciousChar, suspiciousBreakdown } from './sanitize-text';

function sizeClass(size?: string): string {
  if (!size || size === 'm') return '';
  return ` rt-size-${size}`;
}

function colorClass(color?: string, asBase = false): string {
  if (!color) return asBase ? ' text-body' : '';
  if (color === 'body') return ' text-body';
  if (color === 'head') return ' text-head';
  if (color === 'link') return ' text-link';
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
      if (marks.color && marks.color !== 'body') attrs += ` data-rt-color="${marks.color}"`;
    }
    push('span', attrs);
  }
  if (marks.link?.href) {
    const target = marks.link.target === '_self' ? '_self' : '_blank';
    const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
    push('a', ` href="${escapeHtml(marks.link.href)}" target="${target}"${rel} class="rt-link text-link"`);
  }
  if (marks.bold) push('strong');
  if (marks.italic) push('em');
  if (marks.strike) push('s');
  if (marks.sup) push('sup');
  if (marks.sub) push('sub');
  if (marks.mono) push('code', ' class="rt-mono"');
  return { open, close };
}

/**
 * How a "name or fallback" piece renders: as the Listmonk template (export), for a sample name
 * (preview; empty sample = the fallback), or as an editor chip.
 */
export type NameRendering = 'listmonk' | { sample: string };

/** Label of the piece's editor chip, e.g. "Guten Tag + Name | Werte Geschäftspartner". */
export function namePieceLabel(piece: Pick<RichNamePiece, 'lead' | 'fallback'>, nameWord: string): string {
  const lead = piece.lead.trim();
  return `${lead ? `${lead} + ` : ''}${nameWord} | ${piece.fallback}`;
}

function renderNamePiece(
  n: RichNamePiece,
  opts: { forEditor?: boolean; names?: NameRendering; nameWord?: string },
): string {
  const { open, close } = openMarks(n.marks, { forEditor: !!opts.forEditor });
  if (opts.forEditor) {
    // The label is generated content, never a text node, so text offsets skip the piece.
    const label = namePieceLabel(n, opts.nameWord ?? 'Name');
    return `${open}<span class="rt-name" contenteditable="false" data-rt-name="1" data-lead="${escapeHtml(n.lead)}" data-fallback="${escapeHtml(n.fallback)}" data-label="${escapeHtml(label)}"></span>${close}`;
  }
  const body =
    opts.names === 'listmonk'
      ? nameTemplate(escapeHtml(n.lead.trim()), escapeHtml(n.fallback))
      : escapeHtml(namePieceText(n, opts.names?.sample ?? ''));
  return `${open}${body}${close}`;
}

/** Inline content of one paragraph as classed HTML (marks, links, breaks, name pieces). */
export function renderInlines(
  children: RichInline[],
  opts: { highlightSuspicious?: boolean; forEditor?: boolean; cleanExport?: boolean; names?: NameRendering; nameWord?: string },
): string {
  return children
    .map((n) => {
      if (n.type === 'br') return '<br>';
      if (n.type === 'name') return renderNamePiece(n, opts);
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
  /** Name pieces: Listmonk template or a sample name; absent = the fallback. */
  names?: NameRendering;
  /** Word for "name" on the editor chip. */
  nameWord?: string;
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
  const inner = renderInlines(p.children, {
    highlightSuspicious: !!opts.highlightSuspicious,
    forEditor: !!opts.forEditor,
    cleanExport: opts.cleanExport,
    names: opts.names,
    nameWord: opts.nameWord,
  });
  return `<p class="${cls}"${dataField}${dataP}${colorAttr}>${inner || '<br>'}</p>`;
}

/** Flatten doc to plain string (for suspicious count / tests). */
export function richDocPlainText(doc: RichDoc): string {
  return (doc || [])
    .map((p) =>
      p.children
        .map((c) => (c.type === 'br' ? '\n' : c.type === 'name' ? c.fallback : c.text))
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

export function richDocSuspiciousBreakdown(doc: RichDoc): ReturnType<typeof suspiciousBreakdown> {
  return suspiciousBreakdown(richDocPlainText(doc));
}
