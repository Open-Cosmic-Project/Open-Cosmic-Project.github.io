import { Routes } from '@angular/router';
import { HomeComponent } from './home';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'OpenCosmicProject · CosmicOS' },
  { path: 'docs', loadComponent: () => import('./docs/docs').then(m => m.DocsComponent), title: 'Docs · OpenCosmicProject' },
  { path: 'docs/:slug', loadComponent: () => import('./docs/docs').then(m => m.DocsComponent) },
  { path: '**', redirectTo: '' },
];
