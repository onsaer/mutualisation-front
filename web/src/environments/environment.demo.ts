import type { AuthConfig } from '../app/core/auth/auth.config';

/**
 * Démo en ligne sans serveur (`ng build --configuration demo`) : données fictives et comptes
 * de démonstration dans le navigateur, adresses en `#/…` pour un hébergement de fichiers statiques.
 */
export const environment = {
  apiMode: 'mock' as 'mock' | 'http',
  apiBaseUrl: '/api',
  auth: { mode: 'demo' } as AuthConfig,
  hashRouting: true,
};
