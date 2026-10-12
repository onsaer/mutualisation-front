import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ResourceApi } from '../../../core/api';
import { EspaceKind } from '../../../shared/models';
import { ChipOption, FilterChips, ResourceGrid, SearchField } from '../../../shared/ui';
import { matchesQuery } from '../../../shared/utils/search';

type KindFilter = EspaceKind | 'tous';

const KIND_OPTIONS: readonly ChipOption<KindFilter>[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'stockage', label: 'Stockage' },
  { value: 'bureau', label: 'Bureaux' },
  { value: 'atelier', label: 'Ateliers' },
  { value: 'entrepot', label: 'Entrepôts' },
];

/** B2B : espaces de stockage et bureaux à partager. */
@Component({
  selector: 'app-pro-espaces-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Espaces partagés</h1>
    <p class="mb-4 text-sm text-slate-500">Stockage, bureaux et ateliers entre professionnels.</p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="kindOptions" [(value)]="kind" label="Type d'espace" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="espaces.isLoading()"
      [error]="!!espaces.error()"
    />
  `,
})
export default class ProEspacesPage {
  private readonly api = inject(ResourceApi);

  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly kind = signal<KindFilter>('tous');
  protected readonly query = signal('');

  protected readonly espaces = resource({
    loader: () => this.api.list({ type: 'espace', audience: 'pro' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() =>
    this.espaces
      .value()
      .filter((e) => this.kind() === 'tous' || e.kind === this.kind())
      .filter((e) => matchesQuery(e, this.query())),
  );
}
