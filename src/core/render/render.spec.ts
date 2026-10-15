import { defaultGlobals } from '../brand/defaults';
import { seedNewsletter } from '../seed';
import { createBlock, type Newsletter } from '../types';
import { renderExport, renderPreview } from './index';
import { escapeAttr, trackLink } from './utils';

function acmeNewsletter(): Newsletter {
  const base = seedNewsletter();
  base.globals = {
    ...defaultGlobals(),
    preheader: 'Acme preheader text',
    pageBgColor: '#112233',
    contentBgColor: '#445566',
    secondaryColor: '#ff00aa',
    standardColor: '#abcdef',
    primaryColor: '#fedcba',
    campaignSubject: 'Acme subject',
    brand: {
      starsText: '***',
      nameHtml: '<span>Acme Corp</span>',
    },
    legal: {
      noticeHtml: 'Acme legal notice',
      companyName: 'Acme Inc',
      companyWebsiteLabel: 'acme.example',
      companyWebsiteHref: 'https://acme.example',
      privacyLabel: 'Privacy',
      privacyHref: 'https://acme.example/privacy',
      imprintLabel: 'Imprint',
      imprintHref: 'https://acme.example/imprint',
      unsubscribeLabel: 'Unsubscribe',
      viewInBrowserLabel: 'View in browser',
    },
    exportFileNamePrefix: 'Acme-Listmonk',
    logo: { ...defaultGlobals().logo, alt: 'Acme', href: 'https://acme.example' },
    personalization: defaultGlobals().personalization,
    fontFamily: 'Arial',
  };

  const cta = createBlock('cta-button');
  if (cta.type === 'cta-button') {
    cta.text = 'Buy';
    cta.href = 'https://acme.example/buy';
  }
  base.blocks = [cta];
  return base;
}

describe('render utils', () => {
  it('builds TrackLink with raw quotes (escapeAttr must not be applied to expression)', () => {
    const href = 'https://cloudlib.eu/path?x=1';
    const tracked = trackLink(href);
    expect(tracked).toBe(`{{ TrackLink "${href}" }}`);
    // Simulating the bug: escaping the whole expression would break ListMonk
    expect(escapeAttr(tracked)).not.toBe(tracked);
    expect(tracked.includes('"')).toBe(true);
  });
});

describe('renderExport', () => {
  it('places preheader immediately after body open', () => {
    const html = renderExport(seedNewsletter()).full;
    const bodyIdx = html.search(/<body\b/i);
    const preIdx = html.indexOf('Ihre Kunden sind nicht naiv');
    expect(bodyIdx).toBeGreaterThan(-1);
    expect(preIdx).toBeGreaterThan(bodyIdx);
    const between = html.slice(bodyIdx, preIdx);
    // only body tag + whitespace/div start before preheader text
    expect(between).toMatch(/<body\b[^>]*>\s*<div\b/i);
  });

  it('emits dark-mode color-scheme meta and classes', () => {
    const html = renderExport(seedNewsletter()).full;
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain('name="supported-color-schemes" content="light dark"');
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html).toContain('class="email-bg"');
    expect(html).toContain('--email-page-bg');
    expect(html).toContain('bgcolor=');
  });

  it('exports inlined styles while keeping semantic classes', () => {
    const html = renderExport(seedNewsletter()).full;
    expect(html).toContain('hero-label');
    expect(html).toContain('paragraph-body');
    expect(html).toContain('cta-button-link');
    expect(html).toContain('price-box-inner');
    expect(html).toContain('cta-link-body');
    // Export pipeline bakes class CSS onto elements.
    expect(html).toMatch(/padding:\s*52px 48px 48px 48px/);
    expect(html).toContain('prefers-color-scheme: dark');
  });

  it('strikes through only the old price amount and does not repeat the period', () => {
    const { full } = renderExport(seedNewsletter());
    const line = full.match(/<p[^>]*class="price-strike[^"]*"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? '';
    expect(line).toMatch(/<s\b[^>]*class="price-strike-amount"[^>]*style="[^"]*line-through[^"]*"[^>]*>.*€.*199.*<\/s>/s);
    expect(line.match(/<p[^>]*>/)?.[0]).not.toContain('line-through');
    expect(line.replace(/<s\b[\s\S]*?<\/s>/, '')).toContain('Statt');
    expect(line).not.toContain('netto / Jahr');
  });

  it('draws thin and two-tone dividers across the full row width', () => {
    for (const style of ['thin', 'secondary-double'] as const) {
      const n = seedNewsletter();
      n.blocks = [{ id: 'd', type: 'divider', style }];
      const { full } = renderExport(n);
      const td = full.match(/<td[^>]*class="[^"]*divider-row[^"]*"[^>]*>/)?.[0] ?? '';
      expect(td).toMatch(/padding:\s*0[;"]/);
      expect(td).not.toMatch(/padding:\s*0 48px/);
    }
  });

  it('keeps TrackLink quotes intact on CTA href', () => {
    const { full, body } = renderExport(acmeNewsletter());
    expect(full).toContain('{{ TrackLink "https://acme.example/buy" }}');
    expect(body).toContain('href="{{ TrackLink "https://acme.example/buy" }}"');
    expect(full).toContain('{{ TrackView }}');
    expect(full).toContain('{{ .Campaign.Subject }}');
    expect(full).toContain('{{ UnsubscribeURL }}');
  });

  it('emits shell template placeholder artifact', () => {
    const { standardTemplate } = renderExport(seedNewsletter());
    expect(standardTemplate).toContain('{{ template "content" . }}');
  });

  it('does not hardcode CloudLib when brand is Acme', () => {
    const html = renderExport(acmeNewsletter()).full;
    expect(html).toContain('Acme Corp');
    expect(html).toContain('Acme legal notice');
    expect(html).toContain('Acme Inc');
    expect(html).toContain('acme.example');
    expect(html).toContain('#112233');
    expect(html).not.toContain('CloudLib.EU');
    expect(html).not.toContain('Wise Solutions GmbH');
    expect(html).not.toContain('cloudlib.eu/home/privacy');
  });
});

describe('renderExport chrome isolation', () => {
  it('does not include editor annotate chrome', () => {
    const html = renderExport(seedNewsletter()).full;
    expect(html).not.toContain('data-block-id=');
    expect(html).not.toContain('nte-block');
    expect(html).not.toContain('nte-preview');
    expect(html).not.toContain('nte-edit-btn');
    expect(html).not.toContain('nte-block-index');
    expect(html).not.toContain('nte-drag-handle');
  });
});

describe('renderPreview', () => {
  it('resolves TrackLink to plain URL for iframe safety', () => {
    const html = renderPreview(acmeNewsletter());
    expect(html).toContain('https://acme.example/buy');
    expect(html).not.toContain('{{ TrackLink');
    expect(html).toContain('data-block-id=');
  });
});
