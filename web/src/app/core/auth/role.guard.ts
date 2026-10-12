import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { UserRole } from '../../shared/models';
import { AuthStore } from './auth.store';

/**
 * Autorise le chargement d'une route si l'utilisateur possède l'un des rôles donnés.
 * `canMatch` empêche aussi le téléchargement du bundle lazy-loaded si l'accès est refusé.
 */
export const roleGuard =
  (...allowed: readonly UserRole[]): CanMatchFn =>
  () => {
    const role = inject(AuthStore).role();
    return (role !== null && allowed.includes(role)) || inject(Router).parseUrl('/connexion');
  };
