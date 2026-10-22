/** Whether the browser keeps this site's data under storage pressure and Safari's seven day rule. */
export type PersistentStorageState = 'granted' | 'denied' | 'unsupported';

type StorageApi = Pick<StorageManager, 'persist' | 'persisted'>;

/**
 * Ask once for persistent storage (`navigator.storage.persist()`). Firefox shows a prompt for it,
 * so call this on a save, never at app start. Already granted means no second request.
 */
export async function requestPersistentStorage(
  storage: StorageApi | undefined = globalThis.navigator?.storage,
): Promise<PersistentStorageState> {
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
