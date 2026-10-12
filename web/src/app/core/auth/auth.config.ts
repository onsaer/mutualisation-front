import { InjectionToken } from '@angular/core';

/**
 * Mode de connexion :
 * - `demo` : comptes de démonstration, sans fournisseur d'identité (données fictives ou API en démo).
 * - `oidc` : OpenID Connect (code + PKCE) auprès de Keycloak, qui délègue à itsme.
 */
export type AuthConfig =
  | { readonly mode: 'demo' }
  | {
      readonly mode: 'oidc';
      /** Émetteur, ex. `http://localhost:8080/realms/mutualisation`. */
      readonly authority: string;
      readonly clientId: string;
      /** Alias Keycloak du fournisseur itsme, passé en `kc_idp_hint` pour sauter l'écran Keycloak. */
      readonly itsmeHint: string;
    };

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG', {
  factory: () => ({ mode: 'demo' }),
});
