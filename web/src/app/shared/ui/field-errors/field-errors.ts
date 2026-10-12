import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Signal } from '@angular/core';

/** Sous-ensemble de l'état d'un champ Signal Forms utile à l'affichage des erreurs. */
type FieldLike = () => {
  readonly touched: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly errors: Signal<readonly { readonly message?: string }[]>;
};

/**
 * Affiche la première erreur d'un champ Signal Forms, une fois le champ touché
 * (ou après une tentative d'envoi, qui marque tous les champs comme touchés).
 *
 * @example
 * <input [formField]="f.title" /> <app-field-errors [field]="f.title" />
 */
@Component({
  selector: 'app-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as msg) {
      <p class="mt-1 text-sm text-red-700" role="alert">{{ msg }}</p>
    }
  `,
})
export class FieldErrors {
  readonly field = input.required<FieldLike>();

  protected readonly message = computed(() => {
    const state = this.field()();
    if (!state.touched() || state.valid()) return null;
    return state.errors()[0]?.message ?? 'Valeur invalide.';
  });
}
