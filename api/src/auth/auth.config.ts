/**
 * Mode d'authentification, choisi par les variables d'environnement :
 * - `oidc` dès que `OIDC_ISSUER` est défini : jetons JWT vérifiés (Keycloak, avec itsme en
 *   fournisseur d'identité). C'est le mode de production.
 * - `demo` sinon : `Authorization: Bearer <identifiant utilisateur>`, pour le développement
 *   et les tests. Refusé si `NODE_ENV=production`.
 */
export interface AuthConfig {
  readonly mode: 'oidc' | 'demo';
  /** Ex. `http://localhost:8080/realms/mutualisation`. */
  readonly issuer?: string;
  /** Audience attendue dans les jetons d'accès. */
  readonly audience: string;
  /** URL des clés publiques ; par défaut `<issuer>/protocol/openid-connect/certs` (Keycloak). */
  readonly jwksUrl?: string;
  /** Fournisseur d'identité dont l'identité est vérifiée (claim `identity_provider`). */
  readonly verifiedIdentityProvider: string;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export function authConfigFromEnv(env = process.env): AuthConfig {
  const issuer = env['OIDC_ISSUER'];
  if (!issuer && env['NODE_ENV'] === 'production') {
    throw new Error(
      'OIDC_ISSUER est obligatoire en production (la connexion de démo est désactivée).',
    );
  }
  return {
    mode: issuer ? 'oidc' : 'demo',
    issuer,
    audience: env['OIDC_AUDIENCE'] ?? 'mutualisation-api',
    jwksUrl:
      env['OIDC_JWKS_URL'] ??
      (issuer && `${issuer}/protocol/openid-connect/certs`),
    verifiedIdentityProvider: env['OIDC_VERIFIED_IDP'] ?? 'itsme',
  };
}
