import type { UrlMatcher, UrlSegment } from '@angular/router';

/**
 * Editor addresses, one per panel tab (Current blocks also per view), so browser
 * back / forward returns to the exact place. All URL shapes live here.
 *
 *   /edit/<id>/current-blocks/list | tree
 *   /edit/<id>/catalog | campaign | brand | legal | social | colors
 */

export type EditorPanelTab = 'placed' | 'catalog' | 'campaign' | 'brand' | 'legal' | 'social' | 'colors';

/** Current blocks as a list or as a tree; the list is the default. */
export type PlacedView = 'list' | 'tree';

const TAB_SEGMENTS: Record<EditorPanelTab, string> = {
  placed: 'current-blocks',
  catalog: 'catalog',
  campaign: 'campaign',
  brand: 'brand',
  legal: 'legal',
  social: 'social',
  colors: 'colors',
};

const PLACED_VIEWS: readonly PlacedView[] = ['list', 'tree'];

export interface PanelPlace {
  tab: EditorPanelTab;
  view: PlacedView;
}

export function editorPanelPath(id: string, tab: EditorPanelTab, view: PlacedView): string[] {
  return tab === 'placed' ? ['/edit', id, TAB_SEGMENTS.placed, view] : ['/edit', id, TAB_SEGMENTS[tab]];
}

/** Tab and view behind the segments after `/edit/<id>`; null when they are not a known place. */
export function parsePanelPlace(rest: readonly string[]): { tab: EditorPanelTab; view: PlacedView | null } | null {
  const tab = (Object.keys(TAB_SEGMENTS) as EditorPanelTab[]).find((t) => TAB_SEGMENTS[t] === rest[0]);
  if (!tab) return null;
  if (tab !== 'placed') return rest.length === 1 ? { tab, view: null } : null;
  const view = PLACED_VIEWS.find((v) => v === rest[1]);
  return view && rest.length === 2 ? { tab, view } : null;
}

function editSegments(segments: UrlSegment[]): boolean {
  return segments.length >= 2 && segments[0].path === 'edit';
}

/** `/edit/<id>/<place>` with a known place: params `id`, `tab` and (Current blocks) `view`. */
export const editorPlaceMatcher: UrlMatcher = (segments) => {
  if (!editSegments(segments) || !parsePanelPlace(segments.slice(2).map((s) => s.path))) return null;
  const [, id, tab, view] = segments;
  const posParams: Record<string, UrlSegment> = { id, tab };
  if (view) posParams['view'] = view;
  return { consumed: segments, posParams };
};

/** `/edit/<id>` without a place: param `id`, to be redirected to a known place. */
export const editorDocMatcher: UrlMatcher = (segments) =>
  editSegments(segments) && segments.length === 2 ? { consumed: segments, posParams: { id: segments[1] } } : null;
