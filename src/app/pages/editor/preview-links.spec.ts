import { previewLinkTarget } from './preview-links';

describe('previewLinkTarget', () => {
  it('opens real web links', () => {
    expect(previewLinkTarget('https://cloudlib.eu/kontakt')).toBe('https://cloudlib.eu/kontakt');
    expect(previewLinkTarget(' http://cloudlib.eu ')).toBe('http://cloudlib.eu/');
  });

  it('ignores empty, anchor and template-tag targets', () => {
    expect(previewLinkTarget('')).toBeNull();
    expect(previewLinkTarget(null)).toBeNull();
    expect(previewLinkTarget('#')).toBeNull();
    expect(previewLinkTarget('#top')).toBeNull();
    expect(previewLinkTarget('{{ UnsubscribeURL }}')).toBeNull();
    expect(previewLinkTarget('kontakt')).toBeNull();
  });

  it('ignores placeholder domains', () => {
    expect(previewLinkTarget('https://example.com')).toBeNull();
    expect(previewLinkTarget('https://www.example.com/contact')).toBeNull();
    expect(previewLinkTarget('https://example.org')).toBeNull();
    expect(previewLinkTarget('mailto:maria.muster@example.com')).toBeNull();
  });

  it('keeps mailto and tel with real values', () => {
    expect(previewLinkTarget('mailto:info@cloudlib.eu?subject=Hallo')).toBe('mailto:info@cloudlib.eu?subject=Hallo');
    expect(previewLinkTarget('tel:+49301234567')).toBe('tel:+49301234567');
    expect(previewLinkTarget('mailto:')).toBeNull();
    expect(previewLinkTarget('tel:')).toBeNull();
  });

  it('rejects other schemes', () => {
    expect(previewLinkTarget('javascript:alert(1)')).toBeNull();
    expect(previewLinkTarget('data:text/html,hi')).toBeNull();
  });
});
