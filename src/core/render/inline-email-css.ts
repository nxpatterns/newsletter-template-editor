/**
 * Export-only CSS inliner for class-authored email HTML.
 * Preview keeps classes + stylesheet; export bakes declarations onto elements.
 * @media blocks stay in <style> (dark mode / mobile cannot be fully inlined).
 *
 * ListMonk expressions like {{ TrackLink "url" }} are protected across DOMParser
 * so inner quotes are not treated as HTML attribute delimiters.
 */

export interface InlineEmailCssOptions {
  /** If true, drop class attributes after inlining. Default false (keep dark-mode hooks). */
  stripClasses?: boolean;
}

interface Decls {
  [prop: string]: string;
}

interface Rule {
  selectors: string[];
  decls: Decls;
}

interface ParsedCss {
  rootVars: Decls;
  rules: Rule[];
  residual: string;
}

const LM_PLACEHOLDER = (i: number) => `%%NTE_LM_${i}%%`;
const LM_RESTORE = /%%NTE_LM_(\d+)%%/g;
/** Match ListMonk / template mustache blocks (non-greedy, single-line-ish). */
const LM_EXPR = /\{\{[\s\S]*?\}\}/g;

function protectListMonk(html: string): { html: string; slots: string[] } {
  const slots: string[] = [];
  const out = html.replace(LM_EXPR, (m) => {
    const i = slots.length;
    slots.push(m);
    return LM_PLACEHOLDER(i);
  });
  return { html: out, slots };
}

function restoreListMonk(html: string, slots: string[]): string {
  return html.replace(LM_RESTORE, (_m, idx: string) => slots[Number(idx)] ?? '');
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitTopLevelBlocks(css: string): string[] {
  const blocks: string[] = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i]!)) i += 1;
    if (i >= n) break;
    if (css.startsWith('@media', i) || css.startsWith('@supports', i)) {
      const start = i;
      const brace = css.indexOf('{', i);
      if (brace < 0) break;
      let depth = 0;
      let j = brace;
      for (; j < n; j += 1) {
        const ch = css[j]!;
        if (ch === '{') depth += 1;
        else if (ch === '}') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
      }
      blocks.push(css.slice(start, j).trim());
      i = j;
      continue;
    }
    const brace = css.indexOf('{', i);
    if (brace < 0) break;
    let depth = 0;
    let j = brace;
    for (; j < n; j += 1) {
      const ch = css[j]!;
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          j += 1;
          break;
        }
      }
    }
    blocks.push(css.slice(i, j).trim());
    i = j;
  }
  return blocks.filter(Boolean);
}

function parseDecls(body: string): Decls {
  const out: Decls = {};
  for (const part of body.split(';')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const colon = chunk.indexOf(':');
    if (colon < 0) continue;
    const prop = chunk.slice(0, colon).trim().toLowerCase();
    const value = chunk.slice(colon + 1).trim();
    if (!prop || !value) continue;
    out[prop] = value;
  }
  return out;
}

function parseCss(css: string): ParsedCss {
  const cleaned = stripComments(css);
  const rootVars: Decls = {};
  const rules: Rule[] = [];
  const residualParts: string[] = [];

  for (const block of splitTopLevelBlocks(cleaned)) {
    if (block.startsWith('@media') || block.startsWith('@supports')) {
      residualParts.push(block);
      continue;
    }
    const open = block.indexOf('{');
    const close = block.lastIndexOf('}');
    if (open < 0 || close < open) continue;
    const prelude = block.slice(0, open).trim();
    const body = block.slice(open + 1, close);
    const decls = parseDecls(body);
    if (prelude === ':root') {
      Object.assign(rootVars, decls);
      residualParts.push(
        `:root { ${Object.entries(decls)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')} }`,
      );
      continue;
    }
    const selectors = prelude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (selectors.length === 0 || Object.keys(decls).length === 0) continue;
    // Descendant selectors are only supported for block color scopes (`.cb-<id> …`).
    const simple = selectors.filter((s) => s.startsWith('.cb-') || (!s.includes(' ') && !s.includes('>')));
    if (simple.length === 0) continue;
    rules.push({ selectors: simple, decls });
  }

  return { rootVars, rules, residual: residualParts.join('\n') };
}

function parseInlineStyle(style: string | null): Decls {
  if (!style) return {};
  return parseDecls(style);
}

function serializeDecls(decls: Decls): string {
  return Object.entries(decls)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function resolveVarValue(raw: string, vars: Decls): string {
  let prev = '';
  let cur = raw;
  // Bound iterations against circular vars.
  for (let n = 0; n < 8 && cur !== prev; n += 1) {
    prev = cur;
    cur = cur.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]+|\([^)]*\))+))?\)/g, (_m, name: string, fallback?: string) => {
      const key = name.trim();
      if (vars[key] !== undefined) return vars[key]!;
      if (fallback !== undefined) return fallback.trim();
      return _m;
    });
  }
  return cur;
}

function resolveDecls(decls: Decls, vars: Decls): Decls {
  const out: Decls = {};
  for (const [k, v] of Object.entries(decls)) {
    out[k] = resolveVarValue(v, vars);
  }
  return out;
}

function matchesSelector(el: Element, selector: string): boolean {
  const s = selector.trim();
  if (!s) return false;
  try {
    return el.matches(s);
  } catch {
    return false;
  }
}

function applyRulesToElement(el: Element, rules: Rule[], rootVars: Decls): void {
  let merged: Decls = {};
  for (const rule of rules) {
    if (!rule.selectors.some((sel) => matchesSelector(el, sel))) continue;
    Object.assign(merged, rule.decls);
  }

  const existing = parseInlineStyle(el.getAttribute('style'));
  if (Object.keys(merged).length === 0 && Object.keys(existing).length === 0) return;

  const localVars: Decls = { ...rootVars };
  for (const [k, v] of Object.entries(existing)) {
    if (k.startsWith('--')) localVars[k] = v;
  }
  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith('--')) localVars[k] = resolveVarValue(v, localVars);
  }

  merged = resolveDecls(merged, localVars);
  const finalDecls: Decls = { ...merged };
  for (const [k, v] of Object.entries(existing)) {
    finalDecls[k] = k.startsWith('--') ? v : resolveVarValue(v, localVars);
  }

  if (Object.keys(finalDecls).length === 0) return;
  el.setAttribute('style', serializeDecls(finalDecls));
}

function walkAndInline(root: ParentNode, rules: Rule[], rootVars: Decls): void {
  if (root instanceof Element) applyRulesToElement(root, rules, rootVars);
  root.querySelectorAll('*').forEach((el) => applyRulesToElement(el, rules, rootVars));
}

function serializeDocument(doc: Document): string {
  const el = doc.documentElement;
  if (!el) return '';
  // DOMParser documents are always html; keep a doctype for mail clients.
  return `<!doctype html>\n${el.outerHTML}`;
}

/**
 * Inline non-media CSS rules onto matching elements.
 */
export function inlineEmailCss(html: string, options: InlineEmailCssOptions = {}): string {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const { html: protectedHtml, slots } = protectListMonk(trimmed);
  const isFullDoc = /<html[\s>]/i.test(protectedHtml) || /<!doctype/i.test(protectedHtml);

  const parseInput = isFullDoc
    ? protectedHtml
    : `<!doctype html><html><head></head><body data-nte-frag="1">${protectedHtml}</body></html>`;

  const doc = new DOMParser().parseFromString(parseInput, 'text/html');
  const styles = Array.from(doc.querySelectorAll('style'));
  const cssText = styles.map((s) => s.textContent || '').join('\n');

  if (cssText.trim()) {
    const parsed = parseCss(cssText);
    walkAndInline(doc.documentElement, parsed.rules, parsed.rootVars);

    styles.forEach((el, idx) => {
      if (idx === 0) {
        if (parsed.residual.trim()) el.textContent = `\n${parsed.residual}\n`;
        else el.remove();
      } else {
        el.remove();
      }
    });
  }

  if (options.stripClasses) {
    doc.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'));
  }

  let out: string;
  if (isFullDoc) {
    out = serializeDocument(doc);
  } else {
    out = (doc.body?.innerHTML || '').trim();
  }

  return restoreListMonk(out, slots);
}

/**
 * Inline CSS against a body fragment (table rows) using an explicit stylesheet.
 */
export function inlineEmailCssFragment(fragmentHtml: string, css: string): string {
  const { html: protectedFrag, slots } = protectListMonk(fragmentHtml);
  const wrapped = `<!doctype html><html><head><style>${css}</style></head><body><table id="nte-frag-root" role="presentation">${protectedFrag}</table></body></html>`;
  // Do not double-protect — already protected.
  const doc = new DOMParser().parseFromString(wrapped, 'text/html');
  const styles = Array.from(doc.querySelectorAll('style'));
  const cssText = styles.map((s) => s.textContent || '').join('\n');
  if (cssText.trim()) {
    const parsed = parseCss(cssText);
    walkAndInline(doc.documentElement, parsed.rules, parsed.rootVars);
    styles.forEach((el) => el.remove());
  }
  const table = doc.querySelector('#nte-frag-root');
  const inner = table ? table.innerHTML.trim() : protectedFrag;
  return restoreListMonk(inner, slots);
}
