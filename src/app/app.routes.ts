import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { NewsletterSession } from './editor/newsletter-session.service';
import { editorDocMatcher, editorPanelPath, editorPlaceMatcher } from './editor/panel/panel-routes';
import { AboutPage } from './pages/about/about.page';
import { EditorPage } from './pages/editor/editor.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
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
    // `/edit/<id>` alone: Current blocks in the last used view.
    matcher: editorDocMatcher,
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
  {
    // Block editor; `?from=<template id>` names the template it was opened from (decision 40).
    path: 'blocks/:id',
    loadComponent: () => import('./blocks/block-editor.page').then((m) => m.BlockEditorPage),
    // Leaving with unsaved block changes asks first (the flow loads with the page).
    canDeactivate: [(page: { allowLeave(): Promise<boolean> }) => page.allowLeave()],
  },
  // Shown (without changing the address) when the block behind `/blocks/<id>` does not exist (decision 68).
  { path: 'missing-block', component: NotFoundPage, data: { kind: 'block' } },
  // Shown (without changing the address) when the template behind `/edit/<id>` no longer exists.
  { path: 'missing-template', component: NotFoundPage, data: { kind: 'template' } },
  { path: '**', component: NotFoundPage },
];
