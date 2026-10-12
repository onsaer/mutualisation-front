import type { AuthConfig } from '../app/core/auth/auth.config';

/**
 * Configuration de production (et de `npm run start:api`) : API réelle et connexion
 * OpenID Connect. En production, remplacer `authority` par l'adresse publique de Keycloak.
 */
export const environment = {
  /** `mock` : données en mémoire dans le navigateur. `http` : API NestJS (dossier `api/` du dépôt). */
  apiMode: 'http' as 'mock' | 'http',
  apiBaseUrl: '/api',
  auth: {
    mode: 'oidc',
    authority: 'http://localhost:8080/realms/mutualisation',
    clientId: 'mutualisation-web',
    itsmeHint: 'itsme',
  } as AuthConfig,
};
