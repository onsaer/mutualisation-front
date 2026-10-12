import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { UserRole } from '../../shared/models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/**
 * Autorise le chargement d'une route si l'utilisateur possède l'un des rôles donnés.
 * `canMatch` empêche aussi le téléchargement du bundle lazy-loaded si l'accès est refusé.
 * Une personne connectée sans profil est envoyée vers l'inscription.
 */
export const roleGuard =
  (...allowed: readonly UserRole[]): CanMatchFn =>
  () => {
    const role = inject(AuthStore).role();
    if (role !== null && allowed.includes(role)) return true;
    const router = inject(Router);
    return inject(AuthService).identity()
      ? router.parseUrl('/inscription')
      : router.parseUrl('/connexion');
  };

/** L'inscription n'a de sens qu'après une connexion qui n'a pas trouvé de profil. */
export const registrationGuard: CanMatchFn = () =>
  inject(AuthService).identity() !== null || inject(Router).parseUrl('/connexion');
