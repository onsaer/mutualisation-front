import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';

/**
 * Ajoute l'en-tête d'authentification aux appels de l'API.
 * Démonstration : l'identifiant utilisateur sert de jeton. Avec OpenID Connect,
 * on enverra ici le jeton d'accès (JWT) obtenu à la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const user = inject(AuthStore).user();
  return next(user ? req.clone({ setHeaders: { Authorization: `Bearer ${user.id}` } }) : req);
};
