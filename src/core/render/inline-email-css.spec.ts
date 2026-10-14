import { seedNewsletter } from '../seed';
import { emailDocumentCss } from './email-css';
import { inlineEmailCss, inlineEmailCssFragment } from './inline-email-css';
import { renderExport, renderPreview } from './index';
import { renderExportShell } from './shell';
import { renderBlocks } from './blocks';

describe('inlineEmailCss', () => {
  it('bakes class rules onto elements and keeps media queries', () => {
    const html = `<!doctype html><html><head><style>
      :root { --c: #112233; }
      .box { padding: 10px; color: var(--c); }
      @media (prefers-color-scheme: dark) { .box { color: #fff !important; } }
    </style></head><body><div class="box">Hi</div></body></html>`;
    const out = inlineEmailCss(html);
    expect(out).toMatch(/style="[^"]*padding:\s*10px/);
    expect(out).toMatch(/style="[^"]*color:\s*#112233/);
    expect(out).toContain('prefers-color-scheme: dark');
    expect(out).toContain(':root');
  });

  it('preserves existing custom properties used as vars', () => {
    const html = `<!doctype html><html><head><style>
      .spacer { height: var(--divider-h, 24px); background-color: #0c1628; }
    </style></head><body><div class="spacer" style="--divider-h:40px"></div></body></html>`;
    const out = inlineEmailCss(html);
    expect(out).toMatch(/height:\s*40px/);
    expect(out).toMatch(/background-color:\s*#0c1628/);
    expect(out).toMatch(/--divider-h:\s*40px/);
  });
});

describe('inlineEmailCssFragment', () => {
  it('inlines styles on body rows for ListMonk content', () => {
    const n = seedNewsletter();
    const rows = renderBlocks(n.blocks, { globals: n.globals, mode: 'export', annotate: false });
    const css = emailDocumentCss(n.globals);
    const out = inlineEmailCssFragment(rows, css);
    expect(out).toContain('data-field="amount"');
    expect(out).toMatch(/style="[^"]*font-size:\s*38px/);
    expect(out).toContain('class="');
  });
});

describe('renderExport inliner pipeline', () => {
  it('inlines export HTML while preview stays class-based', () => {
    const n = seedNewsletter();
    const preview = renderPreview(n);
    expect(preview).toContain('class="hero-label text-gold"');
    expect(preview).toContain('.block-pad-hero');
    // Preview must not bake hero pad into style on the hero cell from export inliner
    expect(preview).not.toMatch(/class="[^"]*block-pad-hero[^"]*"[^>]*style="[^"]*padding:\s*52px/);

    const { full, body, standardTemplate } = renderExport(n);
    expect(full).toContain('prefers-color-scheme: dark');
    expect(full).toMatch(/class="[^"]*hero-label[^"]*"[^>]*style="/);
    expect(full).toMatch(/padding:\s*52px 48px 48px 48px/);
    expect(full).toContain('{{ TrackView }}');
    expect(standardTemplate).toContain('{{ template "content" . }}');
    expect(body).toMatch(/style="[^"]*font-size:\s*38px/);
  });

  it('keeps TrackLink expressions intact after inlining', () => {
    const { full, body } = renderExport(seedNewsletter());
    // Seed CTA button uses cloudlib URL
    expect(full).toContain('{{ TrackLink "https://www.cloudlib.eu" }}');
    expect(body).toContain('href="{{ TrackLink "https://www.cloudlib.eu" }}"');
  });

  it('class source before inliner still has no layout dumps', () => {
    const n = seedNewsletter();
    const raw = renderExportShell(
      n.globals,
      renderBlocks(n.blocks, { globals: n.globals, mode: 'export', annotate: false }),
    );
    expect(raw).toContain('class="hero-label text-gold"');
    expect(raw).not.toMatch(/style="padding:14px 0;border-bottom:1px solid #0a1828"/);
  });

  it('verifies export full/body/template contract', () => {
    const { full, body, standardTemplate } = renderExport(seedNewsletter());

    // Full document shape
    expect(full.toLowerCase()).toContain('<!doctype html>');
    expect(full).toContain('<style>');
    expect(full).toContain('prefers-color-scheme: dark');
    expect(full).toContain('name="color-scheme" content="light dark"');
    expect(full).toContain('bgcolor=');

    // Inlined layout from classes
    expect(full).toMatch(/padding:\s*52px 48px 48px 48px/); // hero
    expect(full).toMatch(/font-size:\s*38px/); // price amount
    expect(full).toMatch(/font-size:\s*16px/); // benefits text
    expect(full).toContain('hero-label');
    expect(full).toContain('price-box-inner');
    expect(full).toContain('cta-link-body');

    // ListMonk tokens survive
    expect(full).toContain('{{ TrackView }}');
    expect(full).toContain('{{ .Campaign.Subject }}');
    expect(full).toContain('{{ UnsubscribeURL }}');
    expect(full).toContain('{{ MessageURL }}');
    expect(full).toMatch(/\{\{\s*TrackLink\s+"https:\/\/www\.cloudlib\.eu"\s*\}\}/);

    // Body fragment is rows only, inlined, no shell
    expect(body).not.toContain('<!doctype');
    expect(body).not.toContain('<html');
    expect(body).toContain('<tr');
    expect(body).toMatch(/style="[^"]*font-size:\s*38px/);
    expect(body).toMatch(/\{\{\s*TrackLink\s+"https:\/\/www\.cloudlib\.eu"\s*\}\}/);

    // Template shell keeps content injection point
    expect(standardTemplate).toContain('{{ template "content" . }}');
    expect(standardTemplate).toContain('prefers-color-scheme: dark');
    expect(standardTemplate).toContain('bgcolor=');
  });
});
