import { Routes } from '@angular/router';
import { AboutPage } from './pages/about/about.page';
import { EditorPage } from './pages/editor/editor.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: EditorPage },
  { path: 'about', component: AboutPage },
  { path: '**', redirectTo: '' },
];
