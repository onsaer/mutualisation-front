import { Routes } from '@angular/router';
import { ProLayout } from './pro-layout';

/** Espace B2B (TPE, PME, commerçants), monté sous `/pro`. */
export const PRO_ROUTES: Routes = [
  {
    path: '',
    component: ProLayout,
    children: [
      {
        path: '',
        title: 'Espace pro',
        loadComponent: () => import('./pages/pro-dashboard.page'),
      },
      {
        path: 'espaces',
        title: 'Espaces partagés',
        loadComponent: () => import('./pages/pro-espaces.page'),
      },
      {
        path: 'materiel',
        title: 'Matériel professionnel',
        loadComponent: () => import('./pages/pro-materiel.page'),
      },
      {
        path: 'achats-groupes',
        title: 'Achats groupés',
        loadComponent: () => import('./pages/pro-achats-groupes.page'),
      },
      {
        path: 'publier',
        title: 'Publier une annonce',
        loadComponent: () => import('../listings/publish.page'),
      },
    ],
  },
];
