/**
 * The one automatic gate check (decision 84): the old and the parts export show the same texts
 * and the same links. Looks are reviewed on screenshots, not here. Works on the export body,
 * which is generated HTML, so a tag scan is enough and needs no DOM.
 */
export interface TextsAndLinks {
  /** Visible text, whitespace collapsed. */
  text: string;
  /** Every link target in document order. */
  links: string[];
}

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function exportTextsAndLinks(html: string): TextsAndLinks {
  const body = html.replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const links = [...body.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/gi)].map((m) => decode(m[1]!));
  const text = decode(body.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return { text, links };
}

/** Plain-word differences between two exports; empty when texts and links match. */
export function compareTextsAndLinks(before: string, after: string): string[] {
  const a = exportTextsAndLinks(before);
  const b = exportTextsAndLinks(after);
  const out: string[] = [];
  if (a.text !== b.text) out.push(`Text differs:\n  old:   ${a.text}\n  parts: ${b.text}`);
  if (a.links.join('\n') !== b.links.join('\n')) out.push(`Links differ:\n  old:   ${a.links.join(' | ')}\n  parts: ${b.links.join(' | ')}`);
  return out;
}
