import { createUuidV7Source, isUuidV7, uuidV7 } from './uuid-v7';

const zeros = (bytes: Uint8Array) => bytes.fill(0);
const ones = (bytes: Uint8Array) => bytes.fill(0xff);

describe('UUIDv7 source', () => {
  it('makes valid version 7 ids', () => {
    for (let i = 0; i < 50; i++) expect(isUuidV7(uuidV7())).toBe(true);
  });

  it('puts the time in the first 48 bits', () => {
    const ms = Date.UTC(2026, 9, 22, 13, 30);
    const id = createUuidV7Source(() => ms, zeros)();
    expect(parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(ms);
  });

  it('counts up within one millisecond, so ids sort by creation', () => {
    const next = createUuidV7Source(() => 1_000, ones);
    const ids = Array.from({ length: 3000 }, next);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(isUuidV7)).toBe(true);
  });

  it('keeps sorting when the clock goes back', () => {
    let ms = 5_000;
    const next = createUuidV7Source(() => ms, zeros);
    const a = next();
    ms = 4_000;
    const b = next();
    expect(b > a).toBe(true);
  });

  it('starts each millisecond at a random counter', () => {
    const next = createUuidV7Source(() => 7, (bytes) => bytes.fill(0x05));
    expect(next().slice(14, 18)).toBe('7505');
  });

  it('rejects other uuid versions', () => {
    expect(isUuidV7('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(false);
    expect(isUuidV7('b1abc-1')).toBe(false);
  });
});
