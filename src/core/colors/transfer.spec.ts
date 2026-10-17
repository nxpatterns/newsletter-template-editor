import { resolveSlot, setBlockColor, setColorMode } from './edit';
import { defaultColors, resolveGeneralColors } from './model';
import { copyBlockColors, copyConflicts, promotableRole, promoteToGeneral, sameBlockColors } from './transfer';

const a = { id: 'a', type: 'chapter-band' };
const b = { id: 'b', type: 'chapter-band' };
const c = { id: 'c', type: 'chapter-band' };
const stats = { id: 's', type: 'stat-box' };
const all = [a, b, c, stats];

describe('copy block colors to the same block type', () => {
  it('makes every other block of the type exactly the same and leaves other types alone', () => {
    let x = setBlockColor(defaultColors(), 'a', 'title', { hex: '#f4d35e' });
    x = setBlockColor(x, 'a', 'background', { role: 'accent' });
    x = setBlockColor(x, 'b', 'title', { hex: '#ffffff' });
    x = setBlockColor(x, 'c', 'background', { hex: '#2a9d8f' });
    x = setBlockColor(x, 's', 'number', { hex: '#123456' });
    const y = copyBlockColors(x, a, all);
    expect(y.dark.blocks['b']).toEqual(y.dark.blocks['a']);
    expect(y.dark.blocks['c']).toEqual(y.dark.blocks['a']);
    expect(y.dark.blocks['s']).toEqual({ number: { hex: '#123456' } });
    expect(sameBlockColors(y, 'dark', 'a', 'c')).toBe(true);
  });

  it('copying a block without own colors resets the others', () => {
    const x = setBlockColor(defaultColors(), 'b', 'title', { hex: '#ffffff' });
    expect(copyBlockColors(x, a, all).dark.blocks['b']).toBeUndefined();
  });

  it('only touches the active color set', () => {
    let x = setBlockColor(defaultColors(), 'b', 'title', { hex: '#ffffff' });
    x = setColorMode(x, 'light');
    x = setBlockColor(x, 'a', 'title', { hex: '#111111' });
    const y = copyBlockColors(x, a, all);
    expect(y.light.blocks['b']).toEqual({ title: { hex: '#111111' } });
    expect(y.dark.blocks['b']).toEqual({ title: { hex: '#ffffff' } });
  });

  it('lists only the own colors of the others that would be replaced', () => {
    let x = setBlockColor(defaultColors(), 'a', 'title', { hex: '#f4d35e' });
    x = setBlockColor(x, 'b', 'title', { hex: '#f4d35e' });
    x = setBlockColor(x, 'c', 'background', { hex: '#2a9d8f' });
    expect(copyConflicts(x, 'dark', a, all)).toEqual([{ target: c, key: 'background' }]);
  });
});

describe('use a block color as general color', () => {
  it('sets the general color and lets the block follow it again', () => {
    const x = setBlockColor(defaultColors(), 'a', 'title', { hex: '#f4d35e' });
    expect(promotableRole(x, 'dark', a, 'title')).toBe('accent');
    const y = promoteToGeneral(x, a, 'title');
    expect(resolveGeneralColors(y).accent).toBe('#f4d35e');
    expect(y.dark.blocks['a']).toBeUndefined();
    expect(resolveSlot(y, 'dark', b, 'title')).toMatchObject({ hex: '#f4d35e', source: 'general' });
  });

  it('keeps or replaces other own values of that general color as chosen', () => {
    let x = setBlockColor(defaultColors(), 'a', 'title', { hex: '#f4d35e' });
    x = setBlockColor(x, 'b', 'title', { hex: '#ffffff' });
    const refs = [{ target: b, key: 'title' }];
    expect(promoteToGeneral(x, a, 'title', refs, true).dark.blocks['b']).toEqual({ title: { hex: '#ffffff' } });
    expect(promoteToGeneral(x, a, 'title', refs, false).dark.blocks['b']).toBeUndefined();
  });

  it('is not offered for a color that follows a general color', () => {
    const x = setBlockColor(defaultColors(), 'a', 'title', { role: 'link' });
    expect(promotableRole(x, 'dark', a, 'title')).toBeNull();
    expect(promoteToGeneral(x, a, 'title')).toBe(x);
  });
});
