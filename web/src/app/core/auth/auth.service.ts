import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User as OidcUser, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { User } from '../../shared/models';
import { API_BASE_URL, ApiError, request } from '../api/http/http-api.utils';
import { AUTH_CONFIG } from './auth.config';
import { AuthStore } from './auth.store';

/** Identité fournie par le fournisseur d'identité, connue avant la création du profil. */
export interface Identity {
  readonly email?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  /** Vrai si la connexion vient d'itsme : identité vérifiée. */
  readonly verified: boolean;
}

/** Données d'inscription envoyées à `POST /api/me` (l'e-mail vient du jeton). */
export type Registration =
  | (RegistrationBase & { role: 'particulier'; firstName: string; lastName: string })
  | (RegistrationBase & {
      role: 'pro';
      company: { legalName: string; vatNumber: string; size: 'tpe' | 'pme' | 'commercant' };
    });
interface RegistrationBase {
  displayName: string;
  phone?: string;
  address: User['address'];
}

interface LoginState {
  readonly returnUrl?: string;
}

const PROFILE_REQUIRED = 'PROFILE_REQUIRED';

/**
 * Connexion et session.
 *
 * En mode `oidc`, la connexion passe par Keycloak (flux « authorization code » avec PKCE,
 * via `oidc-client-ts`). Keycloak peut déléguer à itsme : le bouton itsme envoie
 * `kc_idp_hint` pour aller directement chez itsme. Le jeton d'accès est ensuite envoyé à l'API,
 * qui retrouve le profil ; une nouvelle personne est dirigée vers `/inscription`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly manager =
    this.config.mode === 'oidc'
      ? new UserManager({
          authority: this.config.authority,
          client_id: this.config.clientId,
          redirect_uri: `${location.origin}/auth/callback`,
          post_logout_redirect_uri: `${location.origin}/`,
          scope: 'openid profile email',
          automaticSilentRenew: true,
          userStore: new WebStorageStateStore({ store: sessionStorage }),
        })
      : null;

  private oidcUser: OidcUser | null = null;
  private readonly _identity = signal<Identity | null>(null);

  readonly mode = this.config.mode;
  /** Connecté chez le fournisseur d'identité mais sans profil : inscription à terminer. */
  readonly identity = this._identity.asReadonly();

  constructor() {
    this.manager?.events.addUserLoaded((u) => {
      this.oidcUser = u;
    });
    this.manager?.events.addUserSignedOut(() => this.clear());
    this.manager?.events.addSilentRenewError(() => this.clear());
  }

  /** Au démarrage : reprend la session enregistrée dans l'onglet, s'il y en a une. */
  async restore(): Promise<void> {
    const user = await this.manager?.getUser();
    if (!user || user.expired) return;
    await this.loadProfile(user).catch(() => this.clear());
  }

  /** Jeton à envoyer à l'API. */
  accessToken(): string | null {
    if (this.config.mode === 'demo') return this.store.user()?.id ?? null;
    return this.oidcUser && !this.oidcUser.expired ? this.oidcUser.access_token : null;
  }

  /** Redirige vers Keycloak, ou directement vers itsme, ou vers la création de compte. */
  async login(
    options: { via?: 'itsme' | 'keycloak' | 'inscription'; returnUrl?: string } = {},
  ): Promise<void> {
    if (this.config.mode !== 'oidc') throw new Error('Connexion OpenID Connect non configurée.');
    const state: LoginState = { returnUrl: options.returnUrl };
    await this.manager!.signinRedirect({
      state,
      prompt: options.via === 'inscription' ? 'create' : undefined,
      extraQueryParams: options.via === 'itsme' ? { kc_idp_hint: this.config.itsmeHint } : {},
    });
  }

  /** Mode démo : entre avec un compte de démonstration. */
  loginAsDemo(user: User): void {
    this.store.setUser(user);
  }

  /** Retour de Keycloak (`/auth/callback`) : renvoie l'URL où poursuivre. */
  async completeLogin(): Promise<string> {
    const user = await this.manager!.signinRedirectCallback();
    const profile = await this.loadProfile(user);
    if (!profile) return '/inscription';
    return (user.state as LoginState | undefined)?.returnUrl ?? homeOf(profile);
  }

  /** Crée le profil de la personne connectée et renvoie l'accueil de son espace. */
  async register(input: Registration): Promise<string> {
    const user = await request(this.http.post<User>(`${this.baseUrl}/me`, input));
    this._identity.set(null);
    this.store.setUser(user);
    return homeOf(user);
  }

  async logout(): Promise<void> {
    // Le jeton d'identité permet à Keycloak de fermer sa session sans demander de confirmation.
    const idToken = this.oidcUser?.id_token;
    this.clear();
    if (idToken) {
      await this.manager!.signoutRedirect({ id_token_hint: idToken });
    } else {
      await this.router.navigateByUrl('/');
    }
  }

  /** Charge le profil ; `null` s'il reste à créer (l'identité est alors gardée pour l'inscription). */
  private async loadProfile(user: OidcUser): Promise<User | null> {
    this.oidcUser = user;
    try {
      const profile = await request(this.http.get<User>(`${this.baseUrl}/me`));
      this._identity.set(null);
      this.store.setUser(profile);
      return profile;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === PROFILE_REQUIRED)) throw e;
      const claims = user.profile;
      this._identity.set({
        email: claims.email,
        givenName: claims.given_name,
        familyName: claims.family_name,
        verified:
          this.config.mode === 'oidc' && claims['identity_provider'] === this.config.itsmeHint,
      });
      this.store.setUser(null);
      return null;
    }
  }

  private clear(): void {
    this.oidcUser = null;
    this._identity.set(null);
    this.store.setUser(null);
    void this.manager?.removeUser();
  }
}

/** Accueil de l'espace d'un utilisateur. */
export const homeOf = (user: User): string => (user.role === 'pro' ? '/pro' : '/particulier');
