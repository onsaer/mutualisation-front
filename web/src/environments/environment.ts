/** Configuration de production : l'application parle à l'API réelle. */
export const environment = {
  /** `mock` : données en mémoire dans le navigateur. `http` : API NestJS (dossier `api/` du dépôt). */
  apiMode: 'http' as 'mock' | 'http',
  apiBaseUrl: '/api',
};
