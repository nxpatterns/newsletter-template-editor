import { CatalogDragService } from './catalog-drag.service';

describe('CatalogDragService', () => {
  it('tracks an active catalog type during drag', () => {
    const svc = new CatalogDragService();
    expect(svc.activeType()).toBeNull();
    expect(svc.isActive()).toBe(false);

    svc.begin('divider');
    expect(svc.activeType()).toBe('divider');
    expect(svc.isActive()).toBe(true);
  });

  it('ends as cancelled when never accepted', () => {
    const svc = new CatalogDragService();
    svc.begin('hero');
    expect(svc.end()).toBe('cancelled');
    expect(svc.activeType()).toBeNull();
    expect(svc.isActive()).toBe(false);
  });

  it('ends as accepted after accept()', () => {
    const svc = new CatalogDragService();
    svc.begin('paragraph');
    svc.accept();
    expect(svc.end()).toBe('accepted');
    expect(svc.activeType()).toBeNull();
  });

  it('begin resets a previous accept flag', () => {
    const svc = new CatalogDragService();
    svc.begin('divider');
    svc.accept();
    svc.begin('hero');
    expect(svc.end()).toBe('cancelled');
  });
});
