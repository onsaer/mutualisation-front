import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Champ de recherche des listes d'annonces (espaces pro et particulier). */
@Component({
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block">
      <span class="sr-only">{{ placeholder() }}</span>
      <input
        type="search"
        class="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
      />
    </label>
  `,
})
export class SearchField {
  readonly value = model('');
  readonly placeholder = input('Nom, commune ou code postal');
}
