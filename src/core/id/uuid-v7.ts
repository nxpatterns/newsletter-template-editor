/** Makes a new id for a stored object (template, own block, block version, draft). */
export type IdSource = () => string;

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidV7(value: string): boolean {
  return UUID_V7.test(value);
}

/**
 * UUIDv7 (RFC 9562): 48 bit Unix time in ms, then randomness. Ids from one source sort by creation:
 * within the same millisecond a 12 bit counter (method 1) counts up from a random start, and a clock
 * that goes back keeps the last timestamp.
 */
export function createUuidV7Source(
  now: () => number = () => Date.now(),
  fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void = (bytes) => crypto.getRandomValues(bytes),
): IdSource {
  let lastMs = -1;
  let counter = 0;
  return () => {
    const bytes = new Uint8Array(16);
    fillRandom(bytes);
    let ms = Math.max(now(), lastMs);
    if (ms === lastMs) {
      counter += 1;
      if (counter > 0xfff) {
        ms += 1;
        counter = randomCounterStart(bytes);
      }
    } else {
      counter = randomCounterStart(bytes);
    }
    lastMs = ms;

    // 48 bit timestamp, big endian; division keeps it exact beyond 32 bit.
    let t = ms;
    for (let i = 5; i >= 0; i--) {
      bytes[i] = t % 256;
      t = Math.floor(t / 256);
    }
    bytes[6] = 0x70 | (counter >> 8);
    bytes[7] = counter & 0xff;
    bytes[8] = 0x80 | (bytes[8] & 0x3f);

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

/** Top bit clear, so at least 2048 more ids fit into the same millisecond. */
function randomCounterStart(bytes: Uint8Array<ArrayBuffer>): number {
  return ((bytes[6] & 0x07) << 8) | bytes[7];
}

/** The app's one id source; inject `ID_SOURCE` in the app instead of importing this. */
export const uuidV7: IdSource = createUuidV7Source();
