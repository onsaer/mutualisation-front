import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEMO_PARTICULIER_USER, DEMO_PRO_USER } from '../../../core/api/mock/mock-data';
import { AuthService, homeOf } from '../../../core/auth/auth.service';
import { User } from '../../../shared/models';
import { Button } from '../../../shared/ui';

/**
 * Connexion. Avec OpenID Connect : itsme (identité vérifiée) ou e-mail et mot de passe,
 * tous deux gérés par Keycloak. En mode démo : deux comptes de démonstration.
 */
@Component({
  selector: 'app-login-page',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-sm flex-col gap-3 p-6">
      <h1 class="text-2xl font-semibold">Connexion</h1>
      @if (auth.mode === 'oidc') {
        <p class="text-sm text-slate-500">
          Avec itsme, votre identité est vérifiée : c'est demandé pour louer du matériel de valeur.
        </p>
        <button
          appButton
          size="lg"
          [fullWidth]="true"
          [loading]="busy() === 'itsme'"
          (click)="go('itsme')"
        >
          Se connecter avec itsme
        </button>
        <button
          appButton
          variant="secondary"
          [fullWidth]="true"
          [loading]="busy() === 'keycloak'"
          (click)="go('keycloak')"
        >
          Se connecter avec une adresse e-mail
        </button>
        <p class="mt-2 text-center text-sm text-slate-500">
          Pas encore de compte ?
          <button
            type="button"
            class="font-medium text-emerald-700 underline"
            (click)="go('inscription')"
          >
            Créer un compte
          </button>
        </p>
        @if (error()) {
          <p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">{{ error() }}</p>
        }
      } @else {
        <p class="text-sm text-slate-500">Mode démonstration : choisissez un compte.</p>
        <button appButton [fullWidth]="true" (click)="demo(pro)">Entrer comme professionnel</button>
        <button appButton variant="secondary" [fullWidth]="true" (click)="demo(particulier)">
          Entrer comme particulier
        </button>
      }
    </section>
  `,
})
export default class LoginPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Page à rouvrir après la connexion (`/connexion?retour=/ressources/r-1`). */
  readonly retour = input<string>();

  protected readonly pro = DEMO_PRO_USER;
  protected readonly particulier = DEMO_PARTICULIER_USER;
  protected readonly busy = signal<'itsme' | 'keycloak' | 'inscription' | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async go(via: 'itsme' | 'keycloak' | 'inscription'): Promise<void> {
    this.busy.set(via);
    this.error.set(null);
    try {
      await this.auth.login({ via, returnUrl: safeReturn(this.retour()) });
    } catch {
      this.busy.set(null);
      this.error.set('Le service de connexion est injoignable. Réessayez dans un instant.');
    }
  }

  protected demo(user: User): void {
    this.auth.loginAsDemo(user);
    void this.router.navigateByUrl(safeReturn(this.retour()) ?? homeOf(user));
  }
}

/** N'accepte qu'un chemin interne, pour ne pas rediriger vers un autre site. */
const safeReturn = (url: string | undefined): string | undefined =>
  url?.startsWith('/') && !url.startsWith('//') ? url : undefined;
