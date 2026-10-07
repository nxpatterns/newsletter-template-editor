import { insertIndexForDrop, isCatalogBlockType, resolveDropAtPoint } from './preview-dnd';

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

  it('resolves append outside the presentation column', () => {
    const container = { left: 100, right: 700, top: 0, bottom: 800 };
    const blocks = [{ id: 'a', top: 100, bottom: 200, height: 100 }];
    expect(resolveDropAtPoint(50, 150, container, blocks)).toEqual({ mode: 'append' });
    expect(resolveDropAtPoint(750, 150, container, blocks)).toEqual({ mode: 'append' });
  });

  it('resolves nearest block inside the presentation column', () => {
    const container = { left: 100, right: 700, top: 0, bottom: 800 };
    const blocks = [
      { id: 'a', top: 100, bottom: 200, height: 100 },
      { id: 'b', top: 220, bottom: 320, height: 100 },
    ];
    expect(resolveDropAtPoint(400, 120, container, blocks)).toEqual({
      mode: 'between',
      blockId: 'a',
      place: 'before',
    });
    expect(resolveDropAtPoint(400, 180, container, blocks)).toEqual({
      mode: 'between',
      blockId: 'a',
      place: 'after',
    });
    expect(resolveDropAtPoint(400, 250, container, blocks)).toEqual({
      mode: 'between',
      blockId: 'b',
      place: 'before',
    });
  });

  it('stays on insert-here for lateral moves still inside the column', () => {
    const container = { left: 100, right: 700, top: 0, bottom: 800 };
    const blocks = [{ id: 'a', top: 100, bottom: 200, height: 100 }];
    // Left edge of column, right edge of column — never flip to append.
    expect(resolveDropAtPoint(101, 150, container, blocks).mode).toBe('between');
    expect(resolveDropAtPoint(699, 150, container, blocks).mode).toBe('between');
  });

  it('appends when above/below the presentation column', () => {
    const container = { left: 100, right: 700, top: 50, bottom: 400 };
    const blocks = [{ id: 'a', top: 100, bottom: 200, height: 100 }];
    expect(resolveDropAtPoint(400, 10, container, blocks)).toEqual({ mode: 'append' });
    expect(resolveDropAtPoint(400, 450, container, blocks)).toEqual({ mode: 'append' });
  });

  it('appends when there is no container or no blocks', () => {
    expect(resolveDropAtPoint(10, 10, null, [])).toEqual({ mode: 'append' });
    const container = { left: 0, right: 100, top: 0, bottom: 100 };
    expect(resolveDropAtPoint(50, 50, container, [])).toEqual({ mode: 'append' });
  });
});
