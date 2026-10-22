import { availableKinds, isEverything, selectedKinds, type ResetInventory } from './reset-kinds';

const empty: ResetInventory = {
  templates: 0,
  hiddenDemos: 0,
  ownBlocks: 0,
  blockDrafts: 0,
  oldestDraftAt: null,
  workingDraft: null,
  viewSettings: 0,
};
const full: ResetInventory = {
  ...empty,
  templates: 12,
  ownBlocks: 3,
  blockDrafts: 5,
  workingDraft: { displayName: 'A', dirty: true, savedAt: '2026-10-22T10:00:00.000Z', libraryId: null },
  viewSettings: 4,
};

describe('reset kinds', () => {
  it('lists every kind with data in display order', () => {
    expect(availableKinds(full)).toEqual(['templates', 'ownBlocks', 'blockDrafts', 'workingDraft', 'viewSettings']);
  });

  it('hides kinds without data (decision 66)', () => {
    expect(availableKinds({ ...full, ownBlocks: 0, blockDrafts: 0 })).toEqual(['templates', 'workingDraft', 'viewSettings']);
    expect(availableKinds(empty)).toEqual([]);
  });

  it('shows templates while deleted demos can come back', () => {
    expect(availableKinds({ ...empty, hiddenDemos: 1 })).toEqual(['templates']);
  });

  it('"everything" only while every available kind is checked (decision 64)', () => {
    const available = availableKinds(full);
    expect(isEverything(available, new Set(available))).toBe(true);
    expect(isEverything(available, new Set(['templates', 'ownBlocks']))).toBe(false);
    expect(isEverything([], new Set())).toBe(false);
  });

  it('keeps the checked kinds in display order and ignores hidden ones', () => {
    expect(selectedKinds(['templates', 'viewSettings'], new Set(['viewSettings', 'ownBlocks', 'templates']))).toEqual([
      'templates',
      'viewSettings',
    ]);
  });
});
