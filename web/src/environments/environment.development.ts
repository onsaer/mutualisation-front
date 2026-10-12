/** `ng serve` : données fictives, aucune API nécessaire. `npm run start:api` utilise l'API. */
export const environment = {
  apiMode: 'mock' as 'mock' | 'http',
  apiBaseUrl: '/api',
};
