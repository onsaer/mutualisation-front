import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ResourceApi } from '../../../core/api';
import { AuthStore } from '../../../core/auth/auth.store';
import { ChipOption, FilterChips, ResourceGrid, SearchField } from '../../../shared/ui';
import { matchesQuery } from '../../../shared/utils/search';

type ZoneFilter = 'commune' | 'tous';

/** B2C : achats groupés de quartier, triés par échéance. */
@Component({
  selector: 'app-particulier-achats-quartier-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Achats de quartier</h1>
    <p class="mb-4 text-sm text-slate-500">Commandez à plusieurs, payez moins, livrez une fois.</p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="zoneOptions()" [(value)]="zone" label="Zone" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="achats.isLoading()"
      [error]="!!achats.error()"
      emptyMessage="Aucun achat groupé ouvert ici. Élargissez la zone ou lancez le vôtre."
    />
  `,
})
export default class ParticulierAchatsQuartierPage {
  private readonly api = inject(ResourceApi);
  private readonly auth = inject(AuthStore);

  protected readonly zone = signal<ZoneFilter>('commune');
  protected readonly query = signal('');

  private readonly postalCode = computed(() => this.auth.user()?.address.postalCode);

  protected readonly zoneOptions = computed<readonly ChipOption<ZoneFilter>[]>(() => [
    { value: 'commune', label: `Ma commune (${this.postalCode() ?? '…'})` },
    { value: 'tous', label: 'Toute la Belgique' },
  ]);

  protected readonly achats = resource({
    loader: () => this.api.list({ type: 'achat_groupe', audience: 'particulier' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() => {
    const now = new Date().toISOString();
    return this.achats
      .value()
      .filter((a) => a.deadline > now)
      .filter((a) => this.zone() === 'tous' || a.address.postalCode === this.postalCode())
      .filter((a) => matchesQuery(a, this.query()))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  });
}
