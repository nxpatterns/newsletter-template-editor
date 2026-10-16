import { emptySocialLinks } from '../brand/social';
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
      stars: { symbol: '*', count: 3 },
      name: { parts: [{ text: 'Acme Corp', color: '#123456' }], size: 'm', bold: true },
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
      social: emptySocialLinks(),
    },
    exportFileNamePrefix: 'Acme-Listmonk',
    logo: { ...defaultGlobals().logo, alt: 'Acme', href: 'https://acme.example' },
    personalization: defaultGlobals().personalization,
    fontFamily: 'Arial',
    assetBaseUrl: '',
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
  it('leaves out switched-off header and footer parts and keeps the rest', () => {
    const n = acmeNewsletter();
    n.globals.hiddenFrameParts = ['logo', 'notice', 'imprint', 'starsBottom'];
    const { full } = renderExport(n);
    expect(full).not.toContain('class="footer-notice');
    expect(full).not.toContain('Imprint</a>');
    expect(full).not.toContain('footer-stars-line');
    expect(full).not.toContain('class="email-logo');
    expect(full).toContain('class="brand-stars');
    expect(full).toMatch(/Privacy<\/a>\s*&nbsp;\|&nbsp;\s*<a[^>]*>Unsubscribe<\/a>/);
  });

  it('shows every header and footer part when nothing is switched off', () => {
    const { full } = renderExport(acmeNewsletter());
    expect(full).toContain('class="email-logo');
    expect(full).toContain('class="footer-notice');
    expect(full).toContain('Imprint</a>');
  });

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

  it('renders a greeting as the fixed line by default, without any name tag', () => {
    const n = seedNewsletter();
    n.blocks = [createBlock('greeting')];
    const { body } = renderExport(n);
    expect(body).toContain('Dear business partner<');
    expect(body).not.toContain('.Subscriber');
  });

  it('greeting by name: preview uses the sample name, export the Listmonk name with fallback', () => {
    const n = seedNewsletter();
    const b = createBlock('greeting');
    if (b.type !== 'greeting') throw new Error('type');
    Object.assign(b, { text: 'Werte Geschäftspartner', useName: true, nameLead: 'Guten Tag', size: 'l', color: 'primary' });
    n.blocks = [b];
    n.globals.personalization.samples['name'] = 'Maria Muster';
    expect(renderPreview(n)).toContain('Guten Tag Maria Muster<');
    expect(renderPreview(n)).toMatch(/class="paragraph-body greeting-line rt-size-l text-primary"/);
    const { body } = renderExport(n);
    expect(body).toContain('Guten Tag {{ $n }}{{- else -}}Werte Geschäftspartner{{- end -}}');
    // Mailbox names like "Info" (Listmonk's stand-in for a missing name) count as unknown.
    expect(body).toMatch(/has \(lower \$n\) \(list "info" "office"/);
    expect(body).not.toContain('.Subscriber.Email');
    n.globals.personalization.samples['name'] = ' ';
    expect(renderPreview(n)).not.toContain('Guten Tag');
  });

  it('renders a contact with tel and mailto links, photo column only with a photo', () => {
    const n = seedNewsletter();
    const b = createBlock('contact');
    if (b.type !== 'contact') throw new Error('type');
    n.blocks = [b];
    let { full } = renderExport(n);
    expect(full).toContain('href="tel:+442012345678"');
    expect(full).toContain('href="mailto:alex.berger@example.com"');
    expect(full).not.toContain('{{ TrackLink "tel:');
    expect(full).not.toMatch(/<td[^>]*contact-photo-cell/);
    expect(full).toContain('Alex Berger');
    expect(full).toContain('Book a meeting');
    expect(full).toMatch(/\.contact-col\s*\{\s*display:\s*block !important/);
    Object.assign(b, { src: 'https://cdn.example.com/alex.jpg', alt: 'Alex Berger' });
    ({ full } = renderExport(n));
    expect(full).toMatch(/<td[^>]*contact-photo-cell/);
    expect(full).toMatch(/<img[^>]*src="https:\/\/cdn\.example\.com\/alex\.jpg"[^>]*alt="Alex Berger"|<img[^>]*alt="Alex Berger"[^>]*src="https:\/\/cdn\.example\.com\/alex\.jpg"/);
  });

  it('leaves a contact without phone, email and button free of those rows', () => {
    const n = seedNewsletter();
    const b = createBlock('contact');
    if (b.type !== 'contact') throw new Error('type');
    Object.assign(b, { phone: '', email: '', buttonLabel: '' });
    n.blocks = [b];
    const { full } = renderExport(n);
    expect(full).not.toContain('tel:');
    expect(full).not.toContain('mailto:');
    expect(full).not.toMatch(/<table[^>]*contact-button/);
  });

  it('keeps an old quote without name, role or picture in the bar layout', () => {
    const n = seedNewsletter();
    n.blocks = [
      { id: 'q', type: 'pull-quote', quote: 'Old quote', name: '', role: '', imageMode: 'none', src: '', alt: '' },
    ];
    const { body } = renderExport(n);
    expect(body).toMatch(/<td[^>]*pull-quote-bar[^>]*width="3"/);
    expect(body).toContain('Old quote');
    expect(body).not.toContain('pull-quote-centered');
    expect(body).not.toContain('quote-by');
  });

  it('renders a customer quote centered with name, role and a round photo', () => {
    const n = seedNewsletter();
    const b = createBlock('pull-quote');
    if (b.type !== 'pull-quote') throw new Error('type');
    Object.assign(b, { imageMode: 'photo', src: 'https://cdn.example.com/sam.jpg', alt: 'Sam Keller' });
    n.blocks = [b];
    const { body } = renderExport(n);
    expect(body).toContain('pull-quote-centered');
    expect(body).not.toContain('pull-quote-bar');
    expect(body).toMatch(/<img[^>]*quote-photo/);
    expect(body).toContain('Sam Keller');
    expect(body).toContain('Owner, Keller Optics');
    b.imageMode = 'logo';
    expect(renderExport(n).body).toMatch(/<img[^>]*quote-logo/);
  });

  it('renders a video preview with linked image and a play row instead of an overlay', () => {
    const n = seedNewsletter();
    const b = createBlock('video');
    if (b.type !== 'video') throw new Error('type');
    Object.assign(b, { src: 'https://cdn.example.com/tour.jpg', alt: '3D tour', href: 'https://example.com/tour' });
    n.blocks = [b];
    const { full } = renderExport(n);
    expect(full).toMatch(/<a href="\{\{ TrackLink "https:\/\/example\.com\/tour" \}\}"[^>]*>\s*<img[^>]*width="504"/);
    expect(full).toMatch(/<td[^>]*video-play-cell[^>]*bgcolor="/i);
    expect(full).toMatch(/<a[^>]*video-title-link[^>]*>Watch the 3D tour<\/a>|video-title-link[\s\S]*Watch the 3D tour/);
    expect(full).toContain('· 2:30');
    expect(full).not.toMatch(/position:\s*absolute/);
    b.src = '';
    expect(renderExport(n).full).not.toContain('nte-image-empty');
  });

  it('renders teasers in rows of the column count, stacking on phones', () => {
    const n = seedNewsletter();
    const b = createBlock('teasers');
    if (b.type !== 'teasers') throw new Error('type');
    b.items = [0, 1, 2].map((i) => ({
      src: `https://cdn.example.com/${i}.jpg`,
      alt: `Pic ${i}`,
      title: `Title ${i}`,
      text: 'Text',
      linkText: 'More',
      href: `https://example.com/${i}`,
    }));
    n.blocks = [b];
    let { full } = renderExport(n);
    const table = full.match(/<table[^>]*teasers-table[\s\S]*?<\/table>/)?.[0] ?? '';
    expect(table.match(/<tr/g)?.length).toBe(2);
    expect(table.match(/<img[^>]*width="242"/g)?.length).toBe(3);
    expect(full).toContain('{{ TrackLink "https://example.com/2" }}');
    expect(full).toMatch(/\.teaser-col\s*\{\s*display:\s*block !important/);
    b.columns = 3;
    ({ full } = renderExport(n));
    expect(full.match(/<img[^>]*width="157"/g)?.length).toBe(3);
    b.items[0].src = '';
    expect(renderExport(n).full.match(/teaser-img/g)?.length).toBeGreaterThanOrEqual(2);
    expect(renderExport(n).full).not.toContain('nte-image-empty');
  });

  it('renders an event with calendar sheet, button and Google Calendar link', () => {
    const n = seedNewsletter();
    const b = createBlock('event');
    if (b.type !== 'event') throw new Error('type');
    Object.assign(b, { date: '2026-11-12', start: '10:00', end: '10:30', locale: 'de', timezone: 'Europe/Berlin' });
    n.blocks = [b];
    let { full } = renderExport(n);
    expect(full).toMatch(/<td[^>]*event-month[^>]*>NOV<\/td>/);
    expect(full).toMatch(/<td[^>]*event-day[^>]*>12<\/td>/);
    expect(full).toContain('Donnerstag');
    expect(full).toContain('10:00 bis 10:30 Uhr · Online, Microsoft Teams');
    expect(full).toContain('Register now');
    expect(full).toMatch(/TrackLink "https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&(amp;)?text=Online%20info%20session&(amp;)?dates=20261112T100000\/20261112T103000&(amp;)?ctz=Europe%2FBerlin/);
    expect(full).toMatch(/\.event-col\s*\{\s*display:\s*block !important/);
    b.calendar = false;
    ({ full } = renderExport(n));
    expect(full).not.toContain('calendar.google.com');
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
