import { buildLinkHref, detectLinkKind, parseLinkHref } from './link-address';

describe('detectLinkKind', () => {
  it.each([
    ['cloudlib.eu', 'web'],
    ['https://cloudlib.eu/de', 'web'],
    ['www.cloudlib.eu', 'web'],
    ['info@cloudlib.eu', 'email'],
    ['info@', 'email'],
    ['mailto:info@cloudlib.eu', 'email'],
    ['+49 30 1234567', 'phone'],
    ['tel:+49301234567', 'phone'],
    ['', null],
    ['hallo', null],
  ])('%s → %s', (raw, kind) => {
    expect(detectLinkKind(raw)).toBe(kind);
  });
});

describe('buildLinkHref', () => {
  it('adds https to a bare domain', () => {
    expect(buildLinkHref('web', 'cloudlib.eu')).toBe('https://cloudlib.eu');
  });

  it('rejects unsafe or incomplete web addresses', () => {
    expect(buildLinkHref('web', 'javascript:alert(1)')).toBeNull();
    expect(buildLinkHref('web', 'cloudlib')).toBeNull();
  });

  it('builds a mail link with an optional subject', () => {
    expect(buildLinkHref('email', 'info@cloudlib.eu')).toBe('mailto:info@cloudlib.eu');
    expect(buildLinkHref('email', 'info@cloudlib.eu', 'Anfrage 3D-Rundgang')).toBe(
      'mailto:info@cloudlib.eu?subject=Anfrage%203D-Rundgang',
    );
    expect(buildLinkHref('email', 'info@cloudlib')).toBeNull();
  });

  it('builds a phone link from a formatted number', () => {
    expect(buildLinkHref('phone', '+49 (30) 123-4567')).toBe('tel:+49301234567');
    expect(buildLinkHref('phone', '123')).toBeNull();
  });
});

describe('parseLinkHref', () => {
  it('round-trips email with subject and phone', () => {
    expect(parseLinkHref('mailto:info@cloudlib.eu?subject=Anfrage%203D')).toEqual({
      kind: 'email',
      address: 'info@cloudlib.eu',
      subject: 'Anfrage 3D',
    });
    expect(parseLinkHref('tel:+49301234567')).toEqual({ kind: 'phone', address: '+49301234567', subject: '' });
    expect(parseLinkHref('https://cloudlib.eu')).toEqual({ kind: 'web', address: 'https://cloudlib.eu', subject: '' });
  });
});
