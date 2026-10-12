import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingApi, ResourceApi } from '../../../core/api';
import { AuthStore } from '../../../core/auth/auth.store';
import {
  Booking,
  BookingId,
  BookingStatus,
  isProUser,
  isRentalBooking,
  Resource,
  UserId,
} from '../../../shared/models';
import { Button } from '../../../shared/ui';
import { formatDateRange, formatMoney } from '../../../shared/utils/format';

const SHORTCUTS = [
  { path: '/pro/espaces', title: 'Espaces', text: 'Stockage, bureaux, ateliers' },
  { path: '/pro/materiel', title: 'Matériel', text: 'Louer ou proposer un équipement' },
  { path: '/pro/achats-groupes', title: 'Achats groupés', text: 'Commander à plusieurs' },
] as const;

/** B2B : tableau de bord du professionnel connecté. */
@Component({
  selector: 'app-pro-dashboard-page',
  imports: [RouterLink, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Bonjour, {{ displayName() }}</h1>
    <p class="mb-4 text-sm text-slate-500">Voici l'activité de vos annonces.</p>

    <section class="mb-6 grid grid-cols-3 gap-2" aria-label="Indicateurs">
      @for (stat of stats(); track stat.label) {
        <div class="rounded-2xl border border-slate-200 bg-white p-3">
          <p
            class="text-2xl font-semibold"
            [class.text-amber-600]="stat.highlight && stat.value > 0"
          >
            {{ loading() ? '…' : stat.value }}
          </p>
          <p class="text-xs leading-tight text-slate-500">{{ stat.label }}</p>
        </div>
      }
    </section>

    <section class="mb-6" aria-labelledby="pending-title">
      <h2 id="pending-title" class="mb-2 text-lg font-semibold">Demandes à traiter</h2>

      @if (bookings.error()) {
        <p role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger les demandes.
        </p>
      } @else if (loading()) {
        <div class="h-28 animate-pulse rounded-2xl bg-slate-200"></div>
      } @else {
        <ul class="space-y-2">
          @for (b of pending(); track b.id) {
            <li class="rounded-2xl border border-slate-200 bg-white p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ titleOf(b) }}</p>
                  <p class="text-sm text-slate-500">{{ detailOf(b) }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  [class]="
                    b.requesterRole === 'pro'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  "
                >
                  {{ b.requesterRole === 'pro' ? 'Pro' : 'Particulier' }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  [disabled]="busyId() !== null"
                  [loading]="busyId() === b.id && pendingAction() === 'refusee'"
                  (click)="decide(b.id, 'refusee')"
                >
                  Refuser
                </button>
                <button
                  appButton
                  size="sm"
                  [disabled]="busyId() !== null"
                  [loading]="busyId() === b.id && pendingAction() === 'confirmee'"
                  (click)="decide(b.id, 'confirmee')"
                >
                  Accepter
                </button>
              </div>
            </li>
          } @empty {
            <li class="rounded-2xl bg-white p-4 text-center text-sm text-slate-500">
              Aucune demande en attente.
            </li>
          }
        </ul>
      }
      @if (actionError()) {
        <p role="alert" class="mt-2 text-sm text-red-700">{{ actionError() }}</p>
      }
    </section>

    <section aria-labelledby="shortcuts-title">
      <h2 id="shortcuts-title" class="mb-2 text-lg font-semibold">Explorer</h2>
      <div class="grid gap-2 sm:grid-cols-3">
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
export default class ProDashboardPage {
  private readonly auth = inject(AuthStore);
  private readonly resourceApi = inject(ResourceApi);
  private readonly bookingApi = inject(BookingApi);

  protected readonly shortcuts = SHORTCUTS;

  private readonly userId = computed<UserId | undefined>(() => this.auth.user()?.id);

  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    return user && isProUser(user) ? user.company.legalName : (user?.displayName ?? '');
  });

  /** Toutes les annonces de l'utilisateur, les trois types confondus. */
  protected readonly myResources = resource({
    params: () => this.userId(),
    loader: async ({ params: ownerId }): Promise<readonly Resource[]> => {
      const lists = await Promise.all([
        this.resourceApi.list({ type: 'espace', ownerId }),
        this.resourceApi.list({ type: 'materiel', ownerId }),
        this.resourceApi.list({ type: 'achat_groupe', ownerId }),
      ]);
      return lists.flat();
    },
    defaultValue: [],
  });

  protected readonly bookings = resource({
    params: () => this.userId(),
    loader: ({ params: ownerId }) => this.bookingApi.listForOwner(ownerId),
    defaultValue: [],
  });

  protected readonly loading = computed(
    () => this.myResources.isLoading() || this.bookings.isLoading(),
  );

  protected readonly pending = computed(() =>
    this.bookings.value().filter((b) => b.status === 'en_attente'),
  );

  protected readonly stats = computed(() => {
    const upcoming = this.bookings
      .value()
      .filter((b) => b.status === 'confirmee' || b.status === 'en_cours').length;
    return [
      { label: 'Annonces publiées', value: this.myResources.value().length, highlight: false },
      { label: 'Demandes en attente', value: this.pending().length, highlight: true },
      { label: 'Réservations à venir', value: upcoming, highlight: false },
    ];
  });

  private readonly titles = computed(
    () => new Map(this.myResources.value().map((r) => [r.id, r.title])),
  );

  protected readonly busyId = signal<BookingId | null>(null);
  protected readonly pendingAction = signal<BookingStatus | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected titleOf(b: Booking): string {
    return this.titles().get(b.resourceId) ?? 'Annonce';
  }

  protected detailOf(b: Booking): string {
    const what = isRentalBooking(b) ? formatDateRange(b.period) : `${b.quantity} unité(s)`;
    return b.totalPrice ? `${what} · ${formatMoney(b.totalPrice)}` : what;
  }

  /** Accepte ou refuse une demande, puis recharge la liste. */
  protected async decide(id: BookingId, to: Extract<BookingStatus, 'confirmee' | 'refusee'>) {
    const by = this.userId();
    if (!by) return;
    this.busyId.set(id);
    this.pendingAction.set(to);
    this.actionError.set(null);
    try {
      await this.bookingApi.updateStatus(id, to, by);
      this.bookings.reload();
    } catch {
      this.actionError.set("L'action n'a pas pu être enregistrée. Réessayez.");
    } finally {
      this.busyId.set(null);
      this.pendingAction.set(null);
    }
  }
}
