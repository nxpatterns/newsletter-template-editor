import { TestBed } from '@angular/core/testing';
import { PERSISTENT_STORAGE_REQUEST, StoragePersistence } from './storage-persistence.service';

describe('StoragePersistence', () => {
  it('asks the browser only once and remembers the answer', async () => {
    let calls = 0;
    TestBed.configureTestingModule({
      providers: [{ provide: PERSISTENT_STORAGE_REQUEST, useValue: async () => (calls += 1, 'denied' as const) }],
    });
    const service = TestBed.inject(StoragePersistence);
    expect(service.state()).toBeNull();

    await Promise.all([service.ensure(), service.ensure()]);
    await service.ensure();

    expect(calls).toBe(1);
    expect(service.state()).toBe('denied');
  });
});
