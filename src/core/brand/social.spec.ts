import { seedNewsletter } from '../seed';
import { renderExport, renderPreview } from '../render';
import { normalizeNewsletter } from '../persist/normalize-newsletter';
import { emptySocialLinks, hostedSocialIcons, recolorSvg, socialIconFileName } from './social';

function withSocial() {
  const n = seedNewsletter();
  n.globals.legal.social = { ...emptySocialLinks(), linkedin: 'https://linkedin.com/company/acme', youtube: 'https://youtube.com/@acme' };
  return n;
}

describe('footer social row', () => {
  it('shows nothing without links and text links without hosted icons', () => {
    expect(renderExport(seedNewsletter()).full).not.toContain('footer-social');
    const { full } = renderExport(withSocial());
    expect(full).toMatch(/<a href="\{\{ TrackLink "https:\/\/linkedin\.com\/company\/acme" \}\}"[^>]*>LinkedIn<\/a>/);
    expect(full).toContain('YouTube</a>');
    expect(full).not.toContain('footer-social-icon');
  });

  it('uses hosted PNGs named by network and color, never SVG or data URLs, in the export', () => {
    const n = withSocial();
    expect(hostedSocialIcons(n.globals.legal.social, '', '#d8eeff')).toBeNull();
    const icons = hostedSocialIcons(n.globals.legal.social, 'https://lists.example.com/uploads/', '#D8EEFF')!;
    expect(icons).toEqual({
      linkedin: 'https://lists.example.com/uploads/linkedin-d8eeff.png',
      youtube: 'https://lists.example.com/uploads/youtube-d8eeff.png',
    });
    const { full, standardTemplate } = renderExport(n, { socialIcons: icons });
    const imgs = full.match(/<img[^>]*footer-social-icon[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toContain('src="https://lists.example.com/uploads/linkedin-d8eeff.png"');
    expect(imgs[0]).toContain('alt="LinkedIn"');
    expect(full).not.toMatch(/footer-social[\s\S]{0,400}(\.svg|data:image)/);
    expect(standardTemplate).toContain('youtube-d8eeff.png');
    expect(socialIconFileName('x', '#ABC123')).toBe('x-abc123.png');
  });

  it('previews with the given icon sources', () => {
    const html = renderPreview(withSocial(), { socialIcons: { linkedin: 'data:a', youtube: 'data:b' } });
    expect(html).toMatch(/<img src="data:a"[^>]*footer-social-icon/);
  });

  it('recolors the root fill of an icon', () => {
    expect(recolorSvg('<svg fill="#000000" viewBox="0 0 24 24"><path d="M0"/></svg>', '#ff0000')).toBe(
      '<svg viewBox="0 0 24 24" fill="#ff0000"><path d="M0"/></svg>',
    );
    expect(recolorSvg('<svg viewBox="0 0 24 24"></svg>', '#fff')).toBe('<svg viewBox="0 0 24 24" fill="#fff"></svg>');
  });

  it('normalizes missing social links and image address to empty values', () => {
    const n = seedNewsletter();
    const raw = structuredClone(n) as unknown as { globals: Record<string, unknown> & { legal: Record<string, unknown> } };
    delete raw.globals.legal['social'];
    delete raw.globals['assetBaseUrl'];
    const out = normalizeNewsletter(raw as never);
    expect(out.globals.legal.social).toEqual(emptySocialLinks());
    expect(out.globals.assetBaseUrl).toBe('');
  });
});
