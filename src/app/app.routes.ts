import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AboutPage } from './pages/about/about.page';
import { EditorPage } from './pages/editor/editor.page';
import { StartPage } from './pages/start/start.page';
import { UnsavedGuardService } from './shell/unsaved-guard.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: StartPage },
  {
    path: 'edit/:id',
    component: EditorPage,
    // Back to the start page asks about unsaved changes; a reload keeps them (draft storage).
    canDeactivate: [
      (_c: unknown, _r: unknown, _s: unknown, next: { url: string }) =>
        next.url === '/' ? inject(UnsavedGuardService).allowLeave() : true,
    ],
  },
  { path: 'about', component: AboutPage },
  { path: '**', redirectTo: '' },
];
