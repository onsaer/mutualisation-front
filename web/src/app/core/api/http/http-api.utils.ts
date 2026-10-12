import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

/** Préfixe des routes de l'API (`/api` derrière le proxy d'`ng serve` ou le reverse proxy). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

/** Erreur renvoyée par l'API, avec son code HTTP (0 si le serveur est injoignable). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Transforme un appel HTTP en Promise, en remplaçant les erreurs par un `Error`
 * `ApiError` dont le message (en français, fourni par l'API) peut être affiché tel quel.
 */
export async function request<T>(call: Observable<T>): Promise<T> {
  try {
    return await firstValueFrom(call);
  } catch (e) {
    if (e instanceof HttpErrorResponse) {
      const message = (e.error as { message?: unknown } | null)?.message;
      throw new ApiError(
        typeof message === 'string'
          ? message
          : e.status === 0
            ? 'Serveur injoignable. Vérifiez votre connexion.'
            : 'Une erreur est survenue. Réessayez.',
        e.status,
      );
    }
    throw e;
  }
}
