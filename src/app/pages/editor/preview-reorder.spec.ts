import { dropPlaceFromY, reorderBlockIds } from './preview-reorder';

describe('reorderBlockIds', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves source before target', () => {
    expect(reorderBlockIds(ids, 'c', 'a', 'before')).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves source after target', () => {
    expect(reorderBlockIds(ids, 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('returns null when order is unchanged', () => {
    expect(reorderBlockIds(ids, 'a', 'b', 'before')).toBeNull();
  });

  it('returns null for unknown ids or same id', () => {
    expect(reorderBlockIds(ids, 'a', 'a', 'after')).toBeNull();
    expect(reorderBlockIds(ids, 'x', 'a', 'after')).toBeNull();
  });
});

describe('dropPlaceFromY', () => {
  it('picks before above midpoint and after below', () => {
    expect(dropPlaceFromY(10, 0, 100)).toBe('before');
    expect(dropPlaceFromY(60, 0, 100)).toBe('after');
  });
});
