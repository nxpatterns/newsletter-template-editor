import { downloadFilename, sanitizeFileStem } from './sanitize-stem';

describe('sanitizeFileStem', () => {
  it('keeps the demo name stable', () => {
    expect(sanitizeFileStem('CloudLib-EU-Example-Newsletter-Template')).toBe('CloudLib-EU-Example-Newsletter-Template');
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
