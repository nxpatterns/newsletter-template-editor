import { insertIndexForDrop, isCatalogBlockType } from './preview-dnd';

describe('preview-dnd', () => {
  it('recognizes catalog types', () => {
    expect(isCatalogBlockType('divider')).toBe(true);
    expect(isCatalogBlockType('nope')).toBe(false);
  });

  it('computes insert index before/after a target', () => {
    const ids = ['a', 'b', 'c'];
    expect(insertIndexForDrop(ids, 'b', 'before')).toBe(1);
    expect(insertIndexForDrop(ids, 'b', 'after')).toBe(2);
    expect(insertIndexForDrop(ids, 'missing', 'after')).toBe(3);
  });
});
