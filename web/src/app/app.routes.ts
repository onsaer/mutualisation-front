import { Routes } from '@angular/router';
import { registrationGuard, roleGuard } from './core/auth/role.guard';

/**
 * Routes racines.
 * Chaque écosystème (B2B `/pro`, B2C `/particulier`) est chargé en lazy loading
 * via `loadChildren` : son code n'est téléchargé que si l'utilisateur y accède.
 * Les fonctionnalités transverses (détail d'une ressource, réservations) sont
 * partagées par les deux espaces, ce qui permet leur interaction.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/home/home.page') },
  { path: 'connexion', loadComponent: () => import('./features/auth/pages/login.page') },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/pages/callback.page') },
  {
    path: 'inscription',
    canMatch: [registrationGuard],
    loadComponent: () => import('./features/auth/pages/registration.page'),
  },
  {
    path: 'pro',
    canMatch: [roleGuard('pro')],
    loadChildren: () => import('./features/pro/pro.routes').then((m) => m.PRO_ROUTES),
  },
  {
    path: 'particulier',
    canMatch: [roleGuard('particulier')],
    loadChildren: () =>
      import('./features/particulier/particulier.routes').then((m) => m.PARTICULIER_ROUTES),
  },
  {
    path: 'ressources/:resourceId',
    loadComponent: () => import('./features/resources/resource-detail.page'),
  },
  {
    path: 'reservations',
    canMatch: [roleGuard('pro', 'particulier')],
    loadComponent: () => import('./features/bookings/my-bookings.page'),
  },
  { path: '**', redirectTo: '' },
];
