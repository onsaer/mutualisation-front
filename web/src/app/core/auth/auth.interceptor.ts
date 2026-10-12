import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api/http/http-api.utils';
import { AuthService } from './auth.service';

/**
 * Ajoute le jeton d'accès aux appels de l'API (et seulement à ceux-là).
 * OpenID Connect : jeton JWT de Keycloak. Démo : identifiant du compte de démonstration.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(inject(API_BASE_URL))) return next(req);
  const token = inject(AuthService).accessToken();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
