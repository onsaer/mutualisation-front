import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Resource } from '../../models';
import { ResourceCard } from '../resource-card/resource-card';

/**
 * Grille responsive de cartes avec états chargement / erreur / vide.
 * Une colonne sur mobile, jusqu'à trois sur grand écran.
 */
@Component({
  selector: 'app-resource-grid',
  imports: [ResourceCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        Impossible de charger les annonces. Vérifiez votre connexion puis réessayez.
      </p>
    } @else if (loading()) {
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        @for (i of skeletons; track i) {
          <div class="h-72 animate-pulse rounded-2xl bg-slate-200"></div>
        }
      </div>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (r of resources(); track r.id) {
          <app-resource-card [resource]="r" />
        } @empty {
          <p class="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-500">
            {{ emptyMessage() }}
          </p>
        }
      </div>
    }
  `,
})
export class ResourceGrid {
  readonly resources = input.required<readonly Resource[]>();
  readonly loading = input(false);
  readonly error = input(false);
  readonly emptyMessage = input('Aucune annonce ne correspond à votre recherche.');

  protected readonly skeletons = [1, 2, 3];
}
