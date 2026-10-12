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

const ALL = 'toutes';

/** B2B : location de matériel professionnel. */
@Component({
  selector: 'app-pro-materiel-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Matériel professionnel</h1>
    <p class="mb-4 text-sm text-slate-500">Louez ou mettez en location votre équipement.</p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="categoryOptions()" [(value)]="category" label="Catégorie" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="materiel.isLoading()"
      [error]="!!materiel.error()"
    />
  `,
})
export default class ProMaterielPage {
  private readonly api = inject(ResourceApi);

  protected readonly category = signal<string>(ALL);
  protected readonly query = signal('');

  protected readonly materiel = resource({
    loader: () => this.api.list({ type: 'materiel', audience: 'pro' }),
    defaultValue: [],
  });

  /** Catégories déduites des annonces disponibles. */
  protected readonly categoryOptions = computed<readonly ChipOption<string>[]>(() => [
    { value: ALL, label: 'Toutes' },
    ...[...new Set(this.materiel.value().map((m) => m.category))]
      .sort()
      .map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  ]);

  protected readonly filtered = computed(() =>
    this.materiel
      .value()
      .filter((m) => this.category() === ALL || m.category === this.category())
      .filter((m) => matchesQuery(m, this.query())),
  );
}
