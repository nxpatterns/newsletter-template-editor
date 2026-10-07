import { DEFAULT_DISPLAY_NAME, downloadFilename, sanitizeFileStem } from './sanitize-stem';

describe('sanitizeFileStem', () => {
  it('keeps default seed name stable', () => {
    expect(sanitizeFileStem(DEFAULT_DISPLAY_NAME)).toBe(DEFAULT_DISPLAY_NAME);
  });

  it('folds German umlauts and drops spaces', () => {
    expect(sanitizeFileStem('Müller Q4')).toBe('Mueller-Q4');
  });

  it('folds Turkish letters', () => {
    expect(sanitizeFileStem('şirket teklif')).toBe('Sirket-Teklif');
  });

  it('uses hash fallback for CJK-only names', () => {
    const a = sanitizeFileStem('北京酒店');
    expect(a.startsWith('Newsletter-Template-')).toBe(true);
    expect(sanitizeFileStem('北京酒店')).toBe(a);
    expect(sanitizeFileStem('上海酒店')).not.toBe(a);
  });

  it('builds download filenames', () => {
    expect(downloadFilename('Acme Offer', 'html')).toBe('Acme-Offer.html');
  });
});
