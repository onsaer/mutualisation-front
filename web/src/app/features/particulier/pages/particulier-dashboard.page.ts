import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingApi, ResourceApi } from '../../../core/api';
import { AuthStore } from '../../../core/auth/auth.store';
import { Booking, isParticulierUser, isRentalBooking } from '../../../shared/models';
import {
  BOOKING_STATUS_BADGES,
  BOOKING_STATUS_LABELS,
  formatDateRange,
  formatMoney,
} from '../../../shared/utils/format';

const SHORTCUTS = [
  { path: '/particulier/outils', title: "Prêt d'outils", text: 'Emprunter à un voisin' },
  { path: '/particulier/co-stockage', title: 'Co-stockage', text: 'Une cave, un garage, un box' },
  {
    path: '/particulier/achats-quartier',
    title: 'Achats de quartier',
    text: 'Commander à plusieurs',
  },
  { path: '/particulier/location-weekend', title: 'Matériel pro', text: 'Louer pour le week-end' },
] as const;

/** Statuts considérés comme « actifs » pour l'utilisateur. */
const ACTIVE = new Set(['en_attente', 'confirmee', 'en_cours']);

/** B2C : tableau de bord du particulier connecté. */
@Component({
  selector: 'app-particulier-dashboard-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Bonjour {{ firstName() }}</h1>
    <p class="mb-4 text-sm text-slate-500">Que voulez-vous partager aujourd'hui ?</p>

    <section class="mb-6" aria-labelledby="mine-title">
      <h2 id="mine-title" class="mb-2 text-lg font-semibold">Mes réservations</h2>

      @if (bookings.error()) {
        <p role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger vos réservations.
        </p>
      } @else if (bookings.isLoading()) {
        <div class="h-24 animate-pulse rounded-2xl bg-slate-200"></div>
      } @else {
        <ul class="space-y-2">
          @for (item of active(); track item.booking.id) {
            <li class="rounded-2xl border border-slate-200 bg-white p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ item.title }}</p>
                  <p class="text-sm text-slate-500">{{ detailOf(item.booking) }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  [class]="badges[item.booking.status]"
                >
                  {{ labels[item.booking.status] }}
                </span>
              </div>
            </li>
          } @empty {
            <li class="rounded-2xl bg-white p-4 text-center text-sm text-slate-500">
              Aucune réservation en cours.
            </li>
          }
        </ul>
      }
    </section>

    <section aria-labelledby="explore-title">
      <h2 id="explore-title" class="mb-2 text-lg font-semibold">Explorer</h2>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
        @for (s of shortcuts; track s.path) {
          <a
            [routerLink]="s.path"
            class="rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-600"
          >
            <p class="font-medium">{{ s.title }}</p>
            <p class="text-sm text-slate-500">{{ s.text }}</p>
          </a>
        }
      </div>
    </section>
  `,
})
export default class ParticulierDashboardPage {
  private readonly auth = inject(AuthStore);
  private readonly resourceApi = inject(ResourceApi);
  private readonly bookingApi = inject(BookingApi);

  protected readonly shortcuts = SHORTCUTS;
  protected readonly labels = BOOKING_STATUS_LABELS;
  protected readonly badges = BOOKING_STATUS_BADGES;

  protected readonly firstName = computed(() => {
    const user = this.auth.user();
    return user && isParticulierUser(user) ? user.firstName : (user?.displayName ?? '');
  });

  /** Réservations de l'utilisateur, enrichies du titre de la ressource. */
  protected readonly bookings = resource({
    params: () => this.auth.user()?.id,
    loader: async ({ params: requesterId }) => {
      const bookings = await this.bookingApi.listForRequester(requesterId);
      const resources = await Promise.all(bookings.map((b) => this.resourceApi.get(b.resourceId)));
      return bookings.map((booking, i) => ({
        booking,
        title: resources[i]?.title ?? 'Annonce',
      }));
    },
    defaultValue: [],
  });

  protected readonly active = computed(() =>
    this.bookings.value().filter((item) => ACTIVE.has(item.booking.status)),
  );

  protected detailOf(b: Booking): string {
    const what = isRentalBooking(b) ? formatDateRange(b.period) : `${b.quantity} unité(s)`;
    return b.totalPrice ? `${what} · ${formatMoney(b.totalPrice)}` : what;
  }
}
