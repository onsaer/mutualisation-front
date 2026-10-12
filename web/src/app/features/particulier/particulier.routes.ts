import { Routes } from '@angular/router';
import { ParticulierLayout } from './particulier-layout';

/** Espace B2C (particuliers), monté sous `/particulier`. */
export const PARTICULIER_ROUTES: Routes = [
  {
    path: '',
    component: ParticulierLayout,
    children: [
      {
        path: '',
        title: 'Espace particulier',
        loadComponent: () => import('./pages/particulier-dashboard.page'),
      },
      {
        path: 'outils',
        title: "Prêt d'outils",
        loadComponent: () => import('./pages/particulier-outils.page'),
      },
      {
        path: 'co-stockage',
        title: 'Co-stockage',
        loadComponent: () => import('./pages/particulier-co-stockage.page'),
      },
      {
        path: 'achats-quartier',
        title: 'Achats de quartier',
        loadComponent: () => import('./pages/particulier-achats-quartier.page'),
      },
      {
        path: 'location-weekend',
        title: 'Matériel pro le week-end',
        loadComponent: () => import('./pages/particulier-location-weekend.page'),
      },
      {
        path: 'publier',
        title: 'Publier une annonce',
        loadComponent: () => import('../listings/publish.page'),
      },
    ],
  },
];
