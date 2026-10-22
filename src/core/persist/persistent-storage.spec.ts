import { requestPersistentStorage } from './persistent-storage';

function storage(persisted: boolean, grant: boolean) {
  const calls = { persist: 0 };
  return {
    calls,
    api: {
      persisted: async () => persisted,
      persist: async () => {
        calls.persist += 1;
        return grant;
      },
    },
  };
}

describe('requestPersistentStorage', () => {
  it('does not ask again when storage is already persistent', async () => {
    const s = storage(true, false);
    expect(await requestPersistentStorage(s.api)).toBe('granted');
    expect(s.calls.persist).toBe(0);
  });

  it('reports what the browser answered', async () => {
    expect(await requestPersistentStorage(storage(false, true).api)).toBe('granted');
    expect(await requestPersistentStorage(storage(false, false).api)).toBe('denied');
  });

  it('is unsupported without the storage API or when it throws', async () => {
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
    const throwing = { persisted: async () => Promise.reject(new Error('blocked')), persist: async () => true };
    expect(await requestPersistentStorage(throwing)).toBe('unsupported');
  });
});
