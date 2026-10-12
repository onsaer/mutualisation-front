import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 select-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

/** Tailles pensées mobile-first : `md` et `lg` respectent la cible tactile de 44 px. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

/**
 * Bouton commun, appliqué en attribut pour garder la sémantique native :
 * `<button appButton>` pour une action, `<a appButton routerLink="…">` pour une navigation.
 *
 * @example
 * <button appButton variant="secondary" [loading]="saving()" (click)="save()">Enregistrer</button>
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.disabled]': 'isButton && (disabled() || loading()) ? "" : null',
    '[attr.aria-disabled]': '!isButton && (disabled() || loading()) ? "true" : null',
  },
  template: `
    @if (loading()) {
      <span
        class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      ></span>
    }
    <ng-content />
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly fullWidth = input(false);
  readonly loading = input(false);
  readonly disabled = input(false);

  /** `true` pour `<button>`, `false` pour `<a>` (un lien ne peut pas être `disabled`). */
  protected readonly isButton =
    (inject(ElementRef).nativeElement as HTMLElement).tagName === 'BUTTON';

  protected readonly classes = computed(() =>
    [BASE, VARIANTS[this.variant()], SIZES[this.size()], this.fullWidth() ? 'w-full' : ''].join(
      ' ',
    ),
  );
}
