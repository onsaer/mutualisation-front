import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NetworkStatusService } from '../pwa/network-status.service';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  /** Glyphe texte (suivi de U+FE0E pour éviter le rendu emoji). */
  readonly icon: string;
  /** Actif uniquement sur l'URL exacte (cas de l'accueil d'un espace). */
  readonly exact: boolean;
}

/**
 * Coquille commune aux espaces Pro et Particulier : en-tête, bandeau hors-ligne et navigation.
 * Navigation en barre basse sur mobile, en haut à partir de `md`.
 *
 * @example
 * <app-space-shell spaceLabel="Pro" homePath="/pro" [nav]="nav" [account]="name()" />
 */
@Component({
  selector: 'app-space-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a [routerLink]="homePath()" class="font-semibold text-emerald-700">
          Mutualisation <span class="text-slate-400">{{ spaceLabel() }}</span>
        </a>
        <nav class="hidden gap-1 md:flex" [attr.aria-label]="'Espace ' + spaceLabel()">
          @for (item of nav(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-emerald-50 text-emerald-700"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="flex items-center gap-3">
          <span class="hidden max-w-40 truncate text-sm text-slate-500 md:inline">{{
            account()
          }}</span>
          <a
            [routerLink]="homePath() + '/publier'"
            class="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Publier
          </a>
        </div>
      </div>
      @if (!network.online()) {
        <p class="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900" role="status">
          Hors-ligne : les données affichées peuvent ne pas être à jour.
        </p>
      }
    </header>

    <main class="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">
      <router-outlet />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-10 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      [style.grid-template-columns]="'repeat(' + nav().length + ', minmax(0, 1fr))'"
      [attr.aria-label]="'Espace ' + spaceLabel()"
    >
      @for (item of nav(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="font-semibold text-emerald-700"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          #rla="routerLinkActive"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="flex h-16 flex-col items-center justify-center gap-0.5 text-xs text-slate-500"
        >
          <span class="text-xl leading-none" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      }
    </nav>
  `,
})
export class SpaceShell {
  readonly spaceLabel = input.required<string>();
  readonly homePath = input.required<string>();
  readonly nav = input.required<readonly NavItem[]>();
  /** Nom affiché en haut à droite (entreprise ou particulier). */
  readonly account = input('');

  protected readonly network = inject(NetworkStatusService);
}
