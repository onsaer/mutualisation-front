import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ResourceApi } from '../../../core/api';
import { AchatGroupeResource } from '../../../shared/models';
import { ChipOption, FilterChips, ResourceGrid, SearchField } from '../../../shared/ui';
import { matchesQuery } from '../../../shared/utils/search';

type GoalFilter = 'tous' | 'en_cours' | 'atteint';

const GOAL_OPTIONS: readonly ChipOption<GoalFilter>[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'en_cours', label: 'Objectif en cours' },
  { value: 'atteint', label: 'Objectif atteint' },
];

const goalReached = (a: AchatGroupeResource) => a.committedQuantity >= a.minQuantity;

/** B2B : achats groupés, triés par échéance la plus proche. */
@Component({
  selector: 'app-pro-achats-groupes-page',
  imports: [FilterChips, ResourceGrid, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Achats groupés</h1>
    <p class="mb-4 text-sm text-slate-500">
      Regroupez vos commandes avec d'autres entreprises pour obtenir de meilleurs prix.
    </p>

    <div class="mb-4 space-y-3">
      <app-search-field [(value)]="query" />
      <app-filter-chips [options]="goalOptions" [(value)]="goal" label="Avancement" />
    </div>

    <app-resource-grid
      [resources]="filtered()"
      [loading]="achats.isLoading()"
      [error]="!!achats.error()"
      emptyMessage="Aucun achat groupé ouvert pour le moment."
    />
  `,
})
export default class ProAchatsGroupesPage {
  private readonly api = inject(ResourceApi);

  protected readonly goalOptions = GOAL_OPTIONS;
  protected readonly goal = signal<GoalFilter>('tous');
  protected readonly query = signal('');

  protected readonly achats = resource({
    loader: () => this.api.list({ type: 'achat_groupe', audience: 'pro' }),
    defaultValue: [],
  });

  protected readonly filtered = computed(() => {
    const now = new Date().toISOString();
    return this.achats
      .value()
      .filter((a) => a.deadline > now)
      .filter((a) => {
        const goal = this.goal();
        return goal === 'tous' || (goal === 'atteint') === goalReached(a);
      })
      .filter((a) => matchesQuery(a, this.query()))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  });
}
