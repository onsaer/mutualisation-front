import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NearbyService, Radius, RADIUS_OPTIONS } from '../../../core/geo/nearby.service';
import { Resource } from '../../models';
import { byDistance } from '../../utils/geo';
import { ResourceCard } from '../resource-card/resource-card';

/**
 * Grille responsive de cartes avec états chargement / erreur / vide.
 * Une colonne sur mobile, jusqu'à trois sur grand écran.
 * « Autour de moi » trie les annonces par distance et filtre par rayon (`nearby`, actif par défaut).
 */
@Component({
  selector: 'app-resource-grid',
  imports: [ResourceCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (nearby()) {
      <div class="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Autour de moi">
        @switch (geo.status()) {
          @case ('on') {
            <span class="text-sm font-medium text-emerald-700">Autour de moi</span>
            @for (r of radii; track r) {
              <button
                type="button"
                class="h-8 rounded-full border px-3 text-sm"
                [class]="
                  geo.radiusKm() === r
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                "
                [attr.aria-pressed]="geo.radiusKm() === r"
                (click)="geo.radiusKm.set(r)"
              >
                {{ r === null ? 'Toute distance' : r + ' km' }}
              </button>
            }
            <button
              type="button"
              class="h-8 px-2 text-sm text-slate-500 underline"
              (click)="geo.stop()"
            >
              Arrêter
            </button>
          }
          @default {
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              [disabled]="geo.status() === 'locating'"
              (click)="geo.locate()"
            >
              <span aria-hidden="true">⌖&#xFE0E;</span>
              {{ geo.status() === 'locating' ? 'Localisation…' : 'Autour de moi' }}
            </button>
            @if (geo.status() === 'denied') {
              <p role="status" class="text-xs text-slate-500">
                Localisation refusée. Autorisez-la dans les réglages du navigateur pour trier par
                distance.
              </p>
            } @else if (geo.status() === 'unavailable') {
              <p role="status" class="text-xs text-slate-500">
                Position introuvable pour le moment. Réessayez dans un instant.
              </p>
            }
          }
        }
      </div>
    }

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
        @for (x of items(); track x.item.id) {
          <app-resource-card [resource]="x.item" [distanceKm]="x.distanceKm" />
        } @empty {
          <p class="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-500">
            {{ sorted() && resources().length ? 'Aucune annonce dans ce rayon.' : emptyMessage() }}
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
  /** Affiche « Autour de moi ». */
  readonly nearby = input(true);

  protected readonly geo = inject(NearbyService);
  protected readonly radii: readonly Radius[] = RADIUS_OPTIONS;
  protected readonly skeletons = [1, 2, 3];

  /** Vrai quand le tri par distance s'applique. */
  protected readonly sorted = computed(() => this.nearby() && this.geo.position() !== null);

  protected readonly items = computed(() => {
    const from = this.geo.position();
    return this.nearby() && from
      ? byDistance(this.resources(), from, this.geo.radiusKm())
      : this.resources().map((item) => ({ item, distanceKm: null }));
  });
}
