import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, homeOf } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';

const SPACES = [
  {
    role: 'particulier',
    title: 'Particuliers',
    lead: 'Entre voisins',
    items: [
      'Prêt d’outils',
      'Cave, garage ou box partagé',
      'Achats groupés de quartier',
      'Matériel pro le week-end',
    ],
  },
  {
    role: 'pro',
    title: 'Professionnels',
    lead: 'TPE, PME et commerces',
    items: [
      'Espaces de stockage et bureaux',
      'Location de matériel pro',
      'Achats groupés entre entreprises',
    ],
  },
] as const;

/** Accueil : présente les deux espaces et mène à la connexion ou à son espace. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header class="space-y-2">
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">Mutualisation</p>
        <h1 class="text-3xl font-semibold text-balance">
          Partager plutôt qu’acheter, près de chez vous
        </h1>
        <p class="text-slate-600">
          Outils, espaces de stockage, matériel et achats groupés, entre voisins et entre
          entreprises, partout en Belgique.
        </p>
      </header>

      @if (user(); as u) {
        <a
          [routerLink]="home(u)"
          class="rounded-2xl bg-emerald-600 px-4 py-3 text-center font-medium text-white hover:bg-emerald-700"
        >
          Continuer vers mon espace
        </a>
      }

      <div class="grid gap-3 sm:grid-cols-2">
        @for (s of spaces; track s.role) {
          <section class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <h2 class="text-lg font-semibold">{{ s.title }}</h2>
              <p class="text-sm text-slate-500">{{ s.lead }}</p>
            </div>
            <ul class="flex-1 space-y-1 text-sm text-slate-700">
              @for (item of s.items; track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <a
              routerLink="/connexion"
              class="rounded-xl border border-emerald-600 px-3 py-2 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Entrer dans l’espace {{ s.title.toLowerCase() }}
            </a>
          </section>
        }
      </div>

      @if (demo) {
        <p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Version de démonstration : les données sont fictives et rien n’est enregistré.
        </p>
      }
    </main>
  `,
})
export default class HomePage {
  protected readonly spaces = SPACES;
  protected readonly user = inject(AuthStore).user;
  protected readonly demo = inject(AuthService).mode === 'demo';
  protected readonly home = homeOf;
}
