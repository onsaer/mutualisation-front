import type { AuthConfig } from '../app/core/auth/auth.config';

/** `ng serve` : données fictives et comptes de démo, aucun serveur nécessaire. */
export const environment = {
  apiMode: 'mock' as 'mock' | 'http',
  apiBaseUrl: '/api',
  auth: { mode: 'demo' } as AuthConfig,
  hashRouting: false,
};
