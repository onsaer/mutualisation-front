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

type SizeFilter = 'tous' | 'petit' | 'grand';

const SIZE_OPTIONS: readonly ChipOption<SizeFilter>[] = [
  { value: 'tous', label: 'Toutes tailles' },
  { value: 'petit', label: 'Moins de 5 m²' },
  { value: 'grand', label: '5 m² et plus' },
];

/** B2C : co-stockage (caves, garages, box), y compris les box proposés par des pros. */
@Component({
  selector: 'app-particulier-co-stockage-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Co-stockage</h1>
    <p class="mb-4 text-sm text-slate-500">
      Une cave, un coin de garage ou un box près de chez vous.
    </p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="sizeOptions" [(value)]="size" label="Surface" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="espaces.isLoading()"
      [error]="!!espaces.error()"
    />
  `,
})
export default class ParticulierCoStockagePage {
  private readonly api = inject(ResourceApi);

  protected readonly sizeOptions = SIZE_OPTIONS;
  protected readonly size = signal<SizeFilter>('tous');
  protected readonly query = signal('');

  protected readonly espaces = resource({
    loader: () => this.api.list({ type: 'espace', audience: 'particulier' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() =>
    this.espaces
      .value()
      .filter((e) => e.kind === 'stockage' || e.kind === 'cave_garage')
      .filter((e) => {
        const size = this.size();
        return size === 'tous' || (size === 'petit') === e.surfaceM2 < 5;
      })
      .filter((e) => matchesQuery(e, this.query())),
  );
}
