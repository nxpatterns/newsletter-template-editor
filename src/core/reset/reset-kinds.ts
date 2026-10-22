/**
 * Kinds of data the reset dialog lists, in display order (decisions 63 to 67). The app language
 * is never one of them; it always stays.
 */
export const RESET_KINDS = ['templates', 'ownBlocks', 'blockDrafts', 'workingDraft', 'viewSettings'] as const;

export type ResetKind = (typeof RESET_KINDS)[number];

/** The open newsletter as the dialog describes it. */
export interface WorkingDraftInfo {
  displayName: string;
  dirty: boolean;
  savedAt: string;
  /** Saved template it belongs to; null for never-saved work. */
  libraryId: string | null;
}

/** What this browser holds right now, per kind. */
export interface ResetInventory {
  templates: number;
  /** Demos removed from the start page; deleting the templates brings them back. */
  hiddenDemos: number;
  ownBlocks: number;
  blockDrafts: number;
  /** Last change of the oldest block draft, null without drafts. */
  oldestDraftAt: string | null;
  workingDraft: WorkingDraftInfo | null;
  /** Remembered view settings (open groups, panel width, …) in localStorage. */
  viewSettings: number;
}

/** Kinds that hold data; the others are hidden, since what does not exist cannot be reset (decision 66). */
export function availableKinds(inv: ResetInventory): ResetKind[] {
  const has: Record<ResetKind, boolean> = {
    templates: inv.templates > 0 || inv.hiddenDemos > 0,
    ownBlocks: inv.ownBlocks > 0,
    blockDrafts: inv.blockDrafts > 0,
    workingDraft: inv.workingDraft !== null,
    viewSettings: inv.viewSettings > 0,
  };
  return RESET_KINDS.filter((k) => has[k]);
}

/** Selected kinds in display order, limited to the available ones. */
export function selectedKinds(available: readonly ResetKind[], selected: ReadonlySet<ResetKind>): ResetKind[] {
  return available.filter((k) => selected.has(k));
}

/** True while every available kind is checked: the delete button then reads "Delete everything" (decision 64). */
export function isEverything(available: readonly ResetKind[], selected: ReadonlySet<ResetKind>): boolean {
  return available.length > 0 && available.every((k) => selected.has(k));
}
