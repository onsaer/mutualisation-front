import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingApi, ResourceApi } from '../../core/api';
import { AuthStore } from '../../core/auth/auth.store';
import {
  AchatGroupeResource,
  DayRange,
  RentableResource,
  ResourceId,
  ResourceType,
} from '../../shared/models';
import { Button, Calendar } from '../../shared/ui';
import { daysUntil, formatMoney, formatPricing } from '../../shared/utils/format';
import { countDays, dayRangeToDateRange, estimateRental } from '../../shared/utils/pricing';

const TYPE_LABELS: Record<ResourceType, string> = {
  materiel: 'Matériel',
  espace: 'Espace',
  achat_groupe: 'Achat groupé',
};

const CONDITION_LABELS = { neuf: 'Neuf', tres_bon: 'Très bon état', bon: 'Bon état', use: 'Usé' };
const ACCESS_LABELS = {
  libre: 'Accès libre',
  sur_rendez_vous: 'Sur rendez-vous',
  badge: 'Badge ou code',
};

/**
 * Détail d'une ressource et réservation, commun aux deux espaces (`/ressources/:resourceId`).
 * Location : choix des jours dans le calendrier et estimation du prix.
 * Achat groupé : choix de la quantité.
 */
@Component({
  selector: 'app-resource-detail-page',
  imports: [RouterLink, Button, Calendar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2">
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full text-xl hover:bg-slate-100"
          aria-label="Retour"
          (click)="back()"
        >
          ←
        </button>
        <span class="font-semibold text-emerald-700">Mutualisation</span>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 pb-12 pt-4">
      @if (item.isLoading()) {
        <div class="h-64 animate-pulse rounded-2xl bg-slate-200" aria-busy="true"></div>
      } @else if (item.error()) {
        <p role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger l'annonce. Vérifiez votre connexion.
        </p>
      } @else if (item.value(); as r) {
        @if (r.photoUrls.length) {
          <!-- Galerie : défilement horizontal avec arrêt sur chaque photo (balayage au doigt). -->
          <div
            class="-mx-4 mb-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
            role="region"
            aria-label="Photos"
            tabindex="0"
          >
            @for (photo of r.photoUrls; track photo; let i = $index) {
              <img
                [src]="photo"
                [alt]="r.title + ' – photo ' + (i + 1) + ' sur ' + r.photoUrls.length"
                [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                class="aspect-video shrink-0 snap-center rounded-2xl object-cover"
                [class]="r.photoUrls.length > 1 ? 'w-[85%]' : 'w-full'"
              />
            }
          </div>
        }

        <p class="mb-1 text-sm text-slate-500">
          {{ typeLabels[r.type] }} · {{ r.address.municipality }} ({{ r.address.postalCode }})
        </p>
        <h1 class="text-2xl font-semibold">{{ r.title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Proposé par {{ r.ownerRole === 'pro' ? 'un professionnel' : 'un particulier' }}
        </p>

        <ul class="mt-4 flex flex-wrap gap-2 text-sm">
          @switch (r.type) {
            @case ('materiel') {
              <li class="rounded-full bg-slate-100 px-3 py-1">
                {{ conditionLabels[r.condition] }}
              </li>
              <li class="rounded-full bg-slate-100 px-3 py-1 capitalize">{{ r.category }}</li>
              @if (r.weekendOnly) {
                <li class="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  Week-end uniquement
                </li>
              }
            }
            @case ('espace') {
              <li class="rounded-full bg-slate-100 px-3 py-1">{{ r.surfaceM2 }} m²</li>
              <li class="rounded-full bg-slate-100 px-3 py-1">{{ accessLabels[r.access] }}</li>
            }
            @case ('achat_groupe') {
              <li class="rounded-full bg-violet-100 px-3 py-1 text-violet-800">
                Clôture dans {{ daysLeft(r) }} jour(s)
              </li>
            }
          }
        </ul>

        @if (r.description) {
          <p class="mt-4 whitespace-pre-line text-slate-700">{{ r.description }}</p>
        }

        <section
          class="mt-6 rounded-2xl border border-slate-200 bg-white p-4"
          aria-labelledby="book-title"
        >
          @if (r.type === 'achat_groupe') {
            <h2 id="book-title" class="text-lg font-semibold">Rejoindre l'achat groupé</h2>
            <p class="text-sm text-slate-600">
              {{ money(r.unitPrice) }} / {{ r.unit }} · {{ r.committedQuantity }} /
              {{ r.minQuantity }} réservés
            </p>
          } @else {
            <h2 id="book-title" class="text-lg font-semibold">Réserver</h2>
            <p class="text-sm text-slate-600">
              {{ pricingLabel(r) }}
              @if (r.deposit) {
                · caution {{ money(r.deposit) }}
              }
            </p>
          }

          @if (done()) {
            <div class="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-900" role="status">
              <p class="font-medium">Demande envoyée !</p>
              <p class="text-sm">
                {{
                  r.type === 'achat_groupe'
                    ? 'Votre participation est enregistrée.'
                    : 'Le propriétaire doit maintenant la confirmer.'
                }}
              </p>
              <a appButton variant="secondary" size="sm" class="mt-3" [routerLink]="homePath()">
                Retour à mon espace
              </a>
            </div>
          } @else if (blocker(); as reason) {
            <p class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{{ reason }}</p>
            @if (!auth.isAuthenticated()) {
              <a
                appButton
                class="mt-3"
                routerLink="/connexion"
                [queryParams]="{ retour: returnUrl }"
                >Se connecter</a
              >
            }
          } @else if (r.type === 'achat_groupe') {
            <div class="mt-4 flex items-center justify-between gap-4">
              <div class="flex items-center gap-2" role="group" aria-label="Quantité">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  aria-label="Moins"
                  [disabled]="quantity() <= 1"
                  (click)="quantity.set(quantity() - 1)"
                >
                  −
                </button>
                <span class="w-10 text-center text-lg font-semibold" aria-live="polite">{{
                  quantity()
                }}</span>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  aria-label="Plus"
                  [disabled]="quantity() >= maxQuantity(r)"
                  (click)="quantity.set(quantity() + 1)"
                >
                  +
                </button>
              </div>
              <p class="text-right">
                <span class="block text-xs text-slate-500">Total</span>
                <span class="text-lg font-semibold">{{
                  money({ amountCents: r.unitPrice.amountCents * quantity(), currency: 'EUR' })
                }}</span>
              </p>
            </div>
            <button
              appButton
              size="lg"
              class="mt-4"
              [fullWidth]="true"
              [loading]="sending()"
              (click)="joinGroupPurchase(r)"
            >
              Rejoindre pour {{ quantity() }} {{ r.unit }}
            </button>
          } @else {
            <div class="mt-4 flex justify-center">
              <app-calendar
                [unavailable]="r.unavailable"
                [weekendOnly]="r.type === 'materiel' && r.weekendOnly"
                [(selection)]="period"
              />
            </div>
            @if (period(); as p) {
              <p class="mt-3 flex justify-between text-sm">
                <span>{{ days(p) }} jour(s)</span>
                <span class="font-semibold">{{ estimateLabel(r, p) }}</span>
              </p>
            }
            <button
              appButton
              size="lg"
              class="mt-4"
              [fullWidth]="true"
              [disabled]="!period()"
              [loading]="sending()"
              (click)="requestRental(r)"
            >
              {{ period() ? 'Demander la réservation' : 'Choisissez vos dates' }}
            </button>
          }

          @if (error(); as e) {
            <p role="alert" class="mt-3 text-sm text-red-700">{{ e }}</p>
          }
        </section>
      } @else {
        <p class="rounded-xl bg-white p-6 text-center text-slate-500">
          Cette annonce n'existe plus.
        </p>
      }
    </main>
  `,
})
export default class ResourceDetailPage {
  /** Paramètre de route `:resourceId` (liaison via `withComponentInputBinding`). */
  readonly resourceId = input.required<string>();
  /** Après connexion, revenir sur cette annonce. */
  protected get returnUrl(): string {
    return `/ressources/${this.resourceId()}`;
  }

  protected readonly auth = inject(AuthStore);
  private readonly resourceApi = inject(ResourceApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly location = inject(Location);

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly accessLabels = ACCESS_LABELS;
  protected readonly money = formatMoney;
  protected readonly days = countDays;

  protected readonly item = resource({
    params: () => this.resourceId() as ResourceId,
    loader: ({ params }) => this.resourceApi.get(params),
  });

  /** Sélection remise à zéro quand on change d'annonce. */
  protected readonly period = linkedSignal<string, DayRange | null>({
    source: this.resourceId,
    computation: () => null,
  });
  protected readonly quantity = linkedSignal({ source: this.resourceId, computation: () => 1 });
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly homePath = computed(() => `/${this.auth.role() ?? ''}`);

  /** Raison empêchant de réserver, ou `null` si la réservation est possible. */
  protected readonly blocker = computed(() => {
    const r = this.item.value();
    const user = this.auth.user();
    if (!r) return null;
    if (!user) return 'Connectez-vous pour réserver.';
    if (r.ownerId === user.id) return "C'est votre annonce.";
    if (!r.audience.includes(user.role)) {
      return `Cette annonce est réservée aux ${r.audience[0] === 'pro' ? 'professionnels' : 'particuliers'}.`;
    }
    if (r.type === 'achat_groupe' && this.maxQuantity(r) < 1)
      return 'Cet achat groupé est complet.';
    if (r.type === 'achat_groupe' && r.deadline < new Date().toISOString()) {
      return 'Cet achat groupé est clôturé.';
    }
    return null;
  });

  protected pricingLabel(r: RentableResource): string {
    return formatPricing(r.pricing);
  }

  protected estimateLabel(r: RentableResource, p: DayRange): string {
    const total = estimateRental(r.pricing, countDays(p));
    return total === null ? 'Prix à convenir' : `Estimation : ${formatMoney(total)}`;
  }

  protected daysLeft(r: AchatGroupeResource): number {
    return daysUntil(r.deadline);
  }

  protected maxQuantity(r: AchatGroupeResource): number {
    return r.maxQuantity ? r.maxQuantity - r.committedQuantity : 99;
  }

  protected requestRental(r: RentableResource): Promise<void> {
    const period = this.period();
    if (!period) return Promise.resolve();
    return this.send({ kind: 'location', resourceId: r.id, period: dayRangeToDateRange(period) });
  }

  protected joinGroupPurchase(r: AchatGroupeResource): Promise<void> {
    return this.send({ kind: 'achat_groupe', resourceId: r.id, quantity: this.quantity() });
  }

  protected back(): void {
    this.location.back();
  }

  private async send(input: Parameters<BookingApi['create']>[0]): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.bookingApi.create(input, user);
      this.done.set(true);
      this.item.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'La réservation a échoué. Réessayez.');
    } finally {
      this.sending.set(false);
    }
  }
}
