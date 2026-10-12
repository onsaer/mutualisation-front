import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { DEMO_PARTICULIER_USER, DEMO_PRO_USER } from '../../../core/api/mock/mock-data';
import { Button } from '../../../shared/ui';

/**
 * Connexion. Provisoire : deux comptes de démonstration en attendant la vraie authentification.
 */
@Component({
  selector: 'app-login-page',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-sm flex-col gap-3 p-6">
      <h1 class="text-2xl font-semibold">Connexion</h1>
      <p class="text-sm text-slate-500">Mode démonstration : choisissez un compte.</p>
      <button appButton [fullWidth]="true" (click)="loginAsPro()">
        Entrer comme professionnel
      </button>
      <button appButton variant="secondary" [fullWidth]="true" (click)="loginAsParticulier()">
        Entrer comme particulier
      </button>
    </section>
  `,
})
export default class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected loginAsPro(): void {
    this.auth.setUser(DEMO_PRO_USER);
    void this.router.navigateByUrl('/pro');
  }

  protected loginAsParticulier(): void {
    this.auth.setUser(DEMO_PARTICULIER_USER);
    void this.router.navigateByUrl('/particulier');
  }
}
