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
import { matchesQuery } from '../../../shared/utils/search';

type PriceFilter = 'tous' | 'gratuit' | 'payant';

const PRICE_OPTIONS: readonly ChipOption<PriceFilter>[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'gratuit', label: 'Prêt gratuit' },
  { value: 'payant', label: 'Petite location' },
];

/** B2C : prêt d'outils entre voisins. */
@Component({
  selector: 'app-particulier-outils-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Prêt d'outils</h1>
    <p class="mb-4 text-sm text-slate-500">Empruntez plutôt qu'acheter, entre voisins.</p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="priceOptions" [(value)]="price" label="Tarif" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="outils.isLoading()"
      [error]="!!outils.error()"
    />
  `,
})
export default class ParticulierOutilsPage {
  private readonly api = inject(ResourceApi);

  protected readonly priceOptions = PRICE_OPTIONS;
  protected readonly price = signal<PriceFilter>('tous');
  protected readonly query = signal('');

  protected readonly outils = resource({
    loader: () =>
      this.api.list({ type: 'materiel', audience: 'particulier', ownerRole: 'particulier' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() =>
    this.outils
      .value()
      .filter((o) => {
        const price = this.price();
        return price === 'tous' || (price === 'gratuit') === (o.pricing.mode === 'gratuit');
      })
      .filter((o) => matchesQuery(o, this.query())),
  );
}
