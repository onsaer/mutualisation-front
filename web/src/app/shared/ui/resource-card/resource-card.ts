import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Resource, ResourceType } from '../../models';
import { daysUntil, formatMoney, formatPricing } from '../../utils/format';
import { formatDistance } from '../../utils/geo';

const TYPE_LABELS: Record<ResourceType, string> = {
  materiel: 'Matériel',
  espace: 'Espace',
  achat_groupe: 'Achat groupé',
};

const TYPE_BADGES: Record<ResourceType, string> = {
  materiel: 'bg-amber-100 text-amber-800',
  espace: 'bg-sky-100 text-sky-800',
  achat_groupe: 'bg-violet-100 text-violet-800',
};

/**
 * Carte de ressource commune aux espaces Pro et Particulier.
 * Le contenu s'adapte au type (`materiel`, `espace`, `achat_groupe`) grâce à l'union discriminée.
 *
 * @example
 * @for (r of resources(); track r.id) { <app-resource-card [resource]="r" /> }
 */
@Component({
  selector: 'app-resource-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = resource();
    <a
      [routerLink]="['/ressources', r.id]"
      class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <!-- Sans photo, un bandeau compact évite de gaspiller l'écran mobile. -->
      <div class="relative bg-slate-100" [class]="r.photoUrls.length ? 'aspect-video' : 'h-12'">
        @if (r.photoUrls[0]; as photo) {
          <img [src]="photo" [alt]="r.title" loading="lazy" class="size-full object-cover" />
        }
        <span
          class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium {{
            badgeClass()
          }}"
        >
          {{ typeLabel() }}
        </span>
      </div>

      <div class="flex flex-1 flex-col gap-1 p-3">
        <h3 class="line-clamp-2 font-semibold text-slate-900">{{ r.title }}</h3>
        <p class="text-sm text-slate-500">
          {{ r.address.municipality }}
          @if (distance(); as d) {
            <span class="text-emerald-700">· {{ d }}</span>
          }
        </p>

        <div class="mt-auto pt-2">
          @switch (r.type) {
            @case ('achat_groupe') {
              <p class="text-sm font-medium text-slate-900">{{ unitPrice() }} / {{ r.unit }}</p>
              <div
                class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                [attr.aria-valuenow]="r.committedQuantity"
                [attr.aria-valuemax]="r.minQuantity"
                [attr.aria-label]="'Objectif de commande'"
              >
                <div class="h-full bg-violet-500" [style.width.%]="progress()"></div>
              </div>
              <p class="mt-1 text-xs text-slate-500">
                {{ r.committedQuantity }} / {{ r.minQuantity }} réservés
                @if (r.committedQuantity >= r.minQuantity) {
                  · <span class="font-medium text-emerald-700">objectif atteint</span>
                }
              </p>
              <p class="text-xs text-violet-700">{{ deadlineLabel() }}</p>
            }
            @default {
              <p class="text-sm font-medium text-slate-900">{{ priceLabel() }}</p>
              @if (r.type === 'materiel' && r.weekendOnly) {
                <p class="text-xs text-amber-700">Disponible le week-end</p>
              }
              @if (r.type === 'espace') {
                <p class="text-xs text-slate-500">{{ r.surfaceM2 }} m²</p>
              }
            }
          }
        </div>
      </div>
    </a>
  `,
})
export class ResourceCard {
  readonly resource = input.required<Resource>();
  /** Distance depuis la position de la personne, si « Autour de moi » est actif. */
  readonly distanceKm = input<number | null>(null);

  protected readonly distance = computed(() => {
    const km = this.distanceKm();
    return km === null ? null : formatDistance(km);
  });

  protected readonly typeLabel = computed(() => TYPE_LABELS[this.resource().type]);
  protected readonly badgeClass = computed(() => TYPE_BADGES[this.resource().type]);

  protected readonly priceLabel = computed(() => {
    const r = this.resource();
    return r.type === 'achat_groupe' ? '' : formatPricing(r.pricing);
  });

  protected readonly unitPrice = computed(() => {
    const r = this.resource();
    return r.type === 'achat_groupe' ? formatMoney(r.unitPrice) : '';
  });

  /** Échéance d'un achat groupé, ex. « Clôture dans 9 jours ». */
  protected readonly deadlineLabel = computed(() => {
    const r = this.resource();
    if (r.type !== 'achat_groupe') return '';
    const days = daysUntil(r.deadline);
    return days === 0 ? "Clôture aujourd'hui" : `Clôture dans ${days} jour${days > 1 ? 's' : ''}`;
  });

  /** Progression vers le seuil de déclenchement d'un achat groupé (0 à 100). */
  protected readonly progress = computed(() => {
    const r = this.resource();
    if (r.type !== 'achat_groupe' || r.minQuantity <= 0) return 0;
    return Math.min(100, Math.round((r.committedQuantity / r.minQuantity) * 100));
  });
}
