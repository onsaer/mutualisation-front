import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ResourceApi } from '../../../core/api';
import { ChipOption, FilterChips, ResourceGrid, SearchField } from '../../../shared/ui';
import { parseIsoDate } from '../../../shared/ui/calendar/calendar.utils';
import { matchesQuery } from '../../../shared/utils/search';
import { isFreeDuring, upcomingWeekend } from '../../../shared/utils/weekend';

type AvailabilityFilter = 'libre' | 'tous';

const AVAILABILITY_OPTIONS: readonly ChipOption<AvailabilityFilter>[] = [
  { value: 'libre', label: 'Libre ce week-end' },
  { value: 'tous', label: 'Tout le matériel' },
];

const dayFormat = new Intl.DateTimeFormat('fr-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * B2C : matériel professionnel loué aux particuliers le week-end,
 * quand les entreprises ne l'utilisent pas. Interaction directe B2B → B2C.
 */
@Component({
  selector: 'app-particulier-location-weekend-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Matériel pro le week-end</h1>
    <p class="mb-4 text-sm text-slate-500">
      Le matériel des entreprises, disponible quand elles ne travaillent pas.
    </p>

    <p class="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      Prochain week-end : <span class="font-medium">{{ weekendLabel }}</span>
    </p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips
        [options]="availabilityOptions"
        [(value)]="availability"
        label="Disponibilité"
      />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="materiel.isLoading()"
      [error]="!!materiel.error()"
      emptyMessage="Tout est déjà réservé ce week-end. Essayez « Tout le matériel »."
    />
  `,
})
export default class ParticulierLocationWeekendPage {
  private readonly api = inject(ResourceApi);

  private readonly weekend = upcomingWeekend();
  protected readonly weekendLabel =
    this.weekend.start === this.weekend.end
      ? dayFormat.format(parseIsoDate(this.weekend.start))
      : `${dayFormat.format(parseIsoDate(this.weekend.start))} et ${dayFormat.format(parseIsoDate(this.weekend.end))}`;

  protected readonly availabilityOptions = AVAILABILITY_OPTIONS;
  protected readonly availability = signal<AvailabilityFilter>('libre');
  protected readonly query = signal('');

  protected readonly materiel = resource({
    loader: () => this.api.list({ type: 'materiel', audience: 'particulier', ownerRole: 'pro' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() =>
    this.materiel
      .value()
      .filter((m) => this.availability() === 'tous' || isFreeDuring(m.unavailable, this.weekend))
      .filter((m) => matchesQuery(m, this.query())),
  );
}
