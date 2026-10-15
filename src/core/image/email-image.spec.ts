import { embeddedFormat, emailSizeReport, isEmbeddedSrc, isSvgSrc } from './email-image';

describe('email image helpers', () => {
  it('tells embedded from linked images and names the format', () => {
    expect(isEmbeddedSrc('data:image/png;base64,AAAA')).toBe(true);
    expect(isEmbeddedSrc('https://x.eu/a.png')).toBe(false);
    expect(embeddedFormat('data:image/jpeg;base64,AA')).toBe('JPG');
    expect(embeddedFormat('data:image/svg+xml;base64,AA')).toBe('SVG');
    expect(embeddedFormat('https://x.eu/a.png')).toBe('');
  });

  it('flags SVG, linked or embedded', () => {
    expect(isSvgSrc('https://x.eu/logo.svg?v=2')).toBe(true);
    expect(isSvgSrc('data:image/svg+xml;base64,AA')).toBe(true);
    expect(isSvgSrc('https://x.eu/logo.png')).toBe(false);
  });

  it('measures the HTML and the part taken by data URLs', () => {
    const html = '<p>ä</p><img src="data:image/png;base64,AAAA">';
    const r = emailSizeReport(html);
    expect(r.totalBytes).toBe(html.length + 1);
    expect(r.embeddedBytes).toBe('data:image/png;base64,AAAA'.length);
  });
});
