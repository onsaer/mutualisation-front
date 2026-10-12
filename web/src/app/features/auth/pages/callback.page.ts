import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Button } from '../../../shared/ui';

/** Retour du fournisseur d'identité : termine la connexion puis redirige. */
@Component({
  selector: 'app-auth-callback-page',
  imports: [Button, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-sm flex-col gap-3 p-6 text-center">
      @if (error()) {
        <h1 class="text-xl font-semibold">Connexion interrompue</h1>
        <p role="alert" class="text-sm text-slate-600">{{ error() }}</p>
        <a appButton routerLink="/connexion">Réessayer</a>
      } @else {
        <p role="status" class="text-slate-600">Connexion en cours…</p>
      }
    </section>
  `,
})
export default class CallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.router.navigateByUrl(await this.auth.completeLogin(), { replaceUrl: true });
    } catch (e) {
      this.error.set(
        e instanceof Error && 'status' in e
          ? e.message
          : 'La connexion n’a pas abouti ou a expiré. Recommencez depuis la page de connexion.',
      );
    }
  }
}
