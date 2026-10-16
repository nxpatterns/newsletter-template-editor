import { buildZip, crc32 } from './zip';

describe('buildZip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes stored entries with local headers, a central directory and the end record', () => {
    const zip = buildZip([
      { path: 'a.html', data: '<p>hi</p>' },
      { path: 'social/x.png', data: new Uint8Array([1, 2, 3]) },
    ]);
    const v = new DataView(zip.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const end = zip.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    const cdOffset = v.getUint32(end + 16, true);
    expect(v.getUint32(cdOffset, true)).toBe(0x02014b50);
    expect(new TextDecoder().decode(zip.slice(30, 36))).toBe('a.html');
    expect(new TextDecoder().decode(zip.slice(36, 45))).toBe('<p>hi</p>');
  });
});
