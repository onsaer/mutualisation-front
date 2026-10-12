import { Injectable, computed, signal } from '@angular/core';
import { User, UserRole } from '../../shared/models';

/**
 * État d'authentification global, basé sur les Signals.
 * La connexion réelle (API, tokens) sera branchée dans une étape ultérieure.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<UserRole | null>(() => this._user()?.role ?? null);

  setUser(user: User | null): void {
    this._user.set(user);
  }
}
