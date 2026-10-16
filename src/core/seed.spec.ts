import { blankNewsletter, DEMO_DISPLAY_NAMES, PLACEHOLDER_LOGO_SRC, placeholderParts, seedNewsletter } from './seed';

describe('demo seeds', () => {
  it('English demo has the same blocks as the German one, with English copy', () => {
    const de = seedNewsletter('de');
    const en = seedNewsletter('en');
    expect(en.blocks.map((b) => `${b.id}:${b.type}`)).toEqual(de.blocks.map((b) => `${b.id}:${b.type}`));
    expect(en.globals.campaignSubject).toContain('walk into your business');
    expect(en.globals.legal.unsubscribeLabel).toBe('Unsubscribe');
    expect(en.globals.logo.src).toBe(de.globals.logo.src);
    const text = JSON.stringify(en.blocks);
    for (const word of ['Ihre', 'Betrieb', 'Termin', 'Statt', 'Jahr']) expect(text).not.toContain(word);
  });

  it('each call returns a fresh copy', () => {
    const a = seedNewsletter('en');
    a.globals.campaignSubject = 'changed';
    expect(seedNewsletter('en').globals.campaignSubject).not.toBe('changed');
    expect(DEMO_DISPLAY_NAMES.en).not.toBe(DEMO_DISPLAY_NAMES.de);
  });

  it('blank newsletter has nothing from CloudLib, only placeholders in that language', () => {
    for (const lang of ['de', 'en'] as const) {
      const n = blankNewsletter(lang);
      expect(n.blocks).toEqual([]);
      expect(n.globals.campaignSubject).toBe('');
      expect(n.globals.preheader).toBe('');
      expect(JSON.stringify(n).toLowerCase()).not.toContain('cloudlib');
      expect(n.globals.logo.src).toBe(PLACEHOLDER_LOGO_SRC);
      expect(placeholderParts(n)).toEqual(['logo', 'links']);
    }
    const en = blankNewsletter('en').globals;
    expect(en.brand.name.parts.map((p) => p.text).join('')).toBe('YourCompany.com');
    expect(en.legal.companyName).toBe('Your Company Name');
    expect(en.legal.privacyLabel).toBe('Privacy');
    const de = blankNewsletter('de').globals;
    expect(de.brand.name.parts.map((p) => p.text).join('')).toBe('IhreFirma.de');
    expect(de.legal.companyWebsiteLabel).toBe('ihrefirma.de');
    expect(de.legal.privacyLabel).toBe('Datenschutz');
    expect(de.legal.privacyHref).toBe('https://example.com/privacy');
  });

  it('demos have no placeholders left', () => {
    expect(placeholderParts(seedNewsletter('de'))).toEqual([]);
  });
});
