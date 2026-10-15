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
    for (const style of ['thin', 'two-tone'] as const) {
      const n = seedNewsletter();
      n.blocks = [{ id: 'd', type: 'divider', style, background: 'content' }];
      const { full } = renderExport(n);
      const td = full.match(/<td[^>]*class="[^"]*divider-row[^"]*"[^>]*>/)?.[0] ?? '';
      expect(td).toMatch(/padding:\s*0[;"]/);
      expect(td).not.toMatch(/padding:\s*0 48px/);
    }
  });

  it('paints the divider with the chosen background token', () => {
    const n = seedNewsletter();
    n.globals.pageBgColor = '#010203';
    n.blocks = [{ id: 'd', type: 'divider', style: 'spacer-only', background: 'page' }];
    const { full } = renderExport(n);
    const td = full.match(/<td[^>]*divider-spacer[^>]*>/)?.[0] ?? '';
    expect(td).toContain('bgcolor="#010203"');
    expect(td).toContain('email-bg');
    expect(td).not.toContain(n.globals.contentBgColor);
  });

  it('mixes the glow steps from Secondary and the background', () => {
    const n = seedNewsletter();
    n.globals.secondaryColor = '#ffffff';
    n.globals.contentBgColor = '#000000';
    n.blocks = [{ id: 'd', type: 'divider', style: 'glow', background: 'content' }];
    const { full } = renderExport(n);
    const steps = [...full.matchAll(/class="divider-glow-step"[^>]*bgcolor="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(steps).toEqual(['#0f0f0f', '#292929', '#5c5c5c', '#ffffff', '#5c5c5c', '#292929', '#0f0f0f']);
  });

  it('draws the ornament diamond in the Accent color', () => {
    const n = seedNewsletter();
    n.blocks = [{ id: 'd', type: 'divider', style: 'ornament', background: 'content' }];
    const { full } = renderExport(n);
    const glyph = full.match(/<td[^>]*divider-ornament-glyph[^>]*>[^<]*<\/td>/)?.[0] ?? '';
    expect(glyph).toMatch(/&#9670;|◆/);
    expect(glyph.toLowerCase()).toContain(n.globals.accentColor.toLowerCase());
  });

  it('renders an image with Outlook width, alt text, link and caption', () => {
    const n = seedNewsletter();
    n.blocks = [
      {
        id: 'i',
        type: 'image',
        src: 'https://cdn.example.eu/a.jpg',
        alt: 'Hotel "Seeblick"',
        href: 'https://example.eu/hotel',
        caption: 'Zimmer 12',
        width: 'small',
      },
    ];
    const { full } = renderExport(n);
    const img = full.match(/<img[^>]*class="email-image"[^>]*>/)?.[0] ?? '';
    expect(img).toContain('src="https://cdn.example.eu/a.jpg"');
    expect(img).toContain('width="252"');
    expect(img).toContain('alt="Hotel &quot;Seeblick&quot;"');
    expect(img).toMatch(/style="[^"]*height:\s*auto/);
    expect(full).toMatch(/<a href="\{\{ TrackLink "https:\/\/example\.eu\/hotel" \}\}"[^>]*>\s*<img/);
    expect(full).toContain('Zimmer 12');
  });

  it('leaves an image block without a picture out of the export', () => {
    const n = seedNewsletter();
    n.blocks = [{ id: 'i', type: 'image', src: '', alt: '', href: '', caption: 'x', width: 'full' }];
    expect(renderExport(n).full).not.toContain('email-image');
  });

  it('renders image and text as two columns, image first in the source', () => {
    const n = seedNewsletter();
    const b = createBlock('image-text');
    if (b.type !== 'image-text') throw new Error('type');
    Object.assign(b, { src: 'https://cdn.example.eu/a.jpg', alt: 'Zimmer', side: 'right', imageWidth: 'half', valign: 'middle' });
    n.blocks = [b];
    const { full } = renderExport(n);
    const table = full.match(/<table[^>]*dir="rtl"[^>]*>[\s\S]*?<\/table>/)?.[0] ?? '';
    expect(table.indexOf('image-text-pic')).toBeGreaterThan(-1);
    expect(table.indexOf('image-text-pic')).toBeLessThan(table.indexOf('image-text-copy'));
    expect(table).toMatch(/<img[^>]*width="242"/);
    expect(table).toMatch(/image-text-copy"[^>]*valign="middle"/);
    expect(full).toContain('New text beside the image.');
    expect(full).toMatch(/\.image-text-col\s*\{\s*display:\s*block !important/);
  });

  it('keeps the text of an image and text block without a picture', () => {
    const n = seedNewsletter();
    n.blocks = [createBlock('image-text')];
    const { full } = renderExport(n);
    expect(full).not.toMatch(/<td[^>]*image-text-pic/);
    expect(full).toContain('New text beside the image.');
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
