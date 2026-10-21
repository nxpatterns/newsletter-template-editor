import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { NewsletterSession } from './editor/newsletter-session.service';
import { editorAnyMatcher, editorPanelPath, editorPlaceMatcher } from './editor/panel/panel-routes';
import { AboutPage } from './pages/about/about.page';
import { EditorPage } from './pages/editor/editor.page';
import { StartPage } from './pages/start/start.page';
import { UnsavedGuardService } from './shell/unsaved-guard.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: StartPage },
  {
    // One route for every tab, so tab changes keep the page (and its preview) alive.
    matcher: editorPlaceMatcher,
    component: EditorPage,
    // Back to the start page asks about unsaved changes; a reload keeps them (draft storage).
    canDeactivate: [
      (_c: unknown, _r: unknown, _s: unknown, next: { url: string }) =>
        next.url === '/' ? inject(UnsavedGuardService).allowLeave() : true,
    ],
  },
  {
    // `/edit/<id>` alone or with an unknown place: Current blocks in the last used view.
    matcher: editorAnyMatcher,
    redirectTo: ({ params }) =>
      inject(Router).createUrlTree(editorPanelPath(params['id'], 'placed', inject(NewsletterSession).placedView())),
  },
  {
    path: 'about',
    component: AboutPage,
    // Same rule as the editor: home asks about unsaved changes; back to the document does not.
    canDeactivate: [
      (_c: unknown, _r: unknown, _s: unknown, next: { url: string }) =>
        next.url === '/' ? inject(UnsavedGuardService).allowLeave() : true,
    ],
  },
  { path: '**', redirectTo: '' },
];
