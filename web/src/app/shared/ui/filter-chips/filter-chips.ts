import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Rangée de filtres à choix unique, défilable horizontalement sur mobile.
 *
 * @example
 * <app-filter-chips [options]="kinds" [(value)]="kind" label="Type d'espace" />
 */
@Component({
  selector: 'app-filter-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="group"
      [attr.aria-label]="label()"
      class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="h-9 shrink-0 rounded-full border px-3 text-sm transition-colors"
          [class]="
            option.value === value()
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          "
          [attr.aria-pressed]="option.value === value()"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class FilterChips<T extends string> {
  readonly options = input.required<readonly ChipOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input.required<string>();
}
