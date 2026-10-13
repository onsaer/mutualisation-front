import type { AuthConfig } from '../app/core/auth/auth.config';

/**
 * Démo en ligne sans serveur (`ng build --configuration demo`) : données fictives et comptes
 * de démonstration dans le navigateur, navigation en mémoire pour fonctionner dans un cadre
 * isolé ou sur un simple hébergement de fichiers statiques.
 */
export const environment = {
  apiMode: 'mock' as 'mock' | 'http',
  apiBaseUrl: '/api',
  auth: { mode: 'demo' } as AuthConfig,
  /** `path` : adresses classiques ; `memory` : démo dans un cadre isolé (voir MemoryLocationStrategy). */
  routing: 'memory' as 'path' | 'memory',
};
