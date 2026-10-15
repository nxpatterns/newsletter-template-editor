import type { RichDoc } from '../../core';

const STORAGE_KEY = 'newsletter-template-editor.paragraph-draft.v1';

export interface ParagraphStashEntry {
  body: RichDoc;
  updatedAt: string;
}

type StashMap = Record<string, ParagraphStashEntry>;

function stashKey(libraryId: string | null, blockId: string): string {
  return `${libraryId ?? 'local'}::${blockId}`;
}

function readMap(): StashMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StashMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: StashMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private */
  }
}

export function loadParagraphStash(
  libraryId: string | null,
  blockId: string,
): ParagraphStashEntry | null {
  const entry = readMap()[stashKey(libraryId, blockId)];
  if (!entry || !Array.isArray(entry.body)) return null;
  return entry;
}

export function saveParagraphStash(
  libraryId: string | null,
  blockId: string,
  body: RichDoc,
): void {
  const map = readMap();
  map[stashKey(libraryId, blockId)] = {
    body: structuredClone(body),
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
}

export function clearParagraphStash(libraryId: string | null, blockId: string): void {
  const map = readMap();
  const key = stashKey(libraryId, blockId);
  if (!(key in map)) return;
  delete map[key];
  writeMap(map);
}

export function paragraphStashDiffers(committed: RichDoc, stashed: RichDoc): boolean {
  return JSON.stringify(committed) !== JSON.stringify(stashed);
}
