import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { DateRange, DayRange, IsoDate } from '../../models';
import {
  buildMonthGrid,
  CalendarDay,
  isInRanges,
  isWeekend,
  nextSelection,
  parseIsoDate,
  toIsoDate,
} from './calendar.utils';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
const monthFormat = new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'full' });

/**
 * Calendrier de sélection de plage, utilisé pour réserver du matériel ou un espace.
 * Bloque les jours passés, les périodes indisponibles et, si demandé, les jours de semaine.
 *
 * @example
 * <app-calendar [unavailable]="r.unavailable" [weekendOnly]="r.weekendOnly" [(selection)]="range" />
 */
@Component({
  selector: 'app-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full max-w-sm select-none rounded-2xl border border-slate-200 bg-white p-3">
      <div class="mb-2 flex items-center justify-between">
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-30"
          [disabled]="!canGoBack()"
          (click)="shiftMonth(-1)"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <p class="font-semibold capitalize" aria-live="polite">{{ monthLabel() }}</p>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full hover:bg-slate-100"
          (click)="shiftMonth(1)"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div role="grid" [attr.aria-label]="monthLabel()">
        <div role="row" class="grid grid-cols-7 text-center text-xs text-slate-500">
          @for (d of weekdays; track $index) {
            <span role="columnheader" class="py-1">{{ d }}</span>
          }
        </div>
        @for (week of weeks(); track week[0]!.date) {
          <div role="row" class="grid grid-cols-7">
            @for (day of week; track day.date) {
              <div role="gridcell" class="p-0.5">
                <button
                  type="button"
                  class="aspect-square w-full rounded-lg text-sm {{ dayClass(day) }}"
                  [disabled]="isDisabled(day.date)"
                  [attr.aria-pressed]="isSelected(day.date)"
                  [attr.aria-label]="ariaLabel(day.date)"
                  (click)="select(day.date)"
                >
                  {{ dayNumber(day.date) }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class Calendar {
  /** Périodes déjà réservées ou indisponibles. */
  readonly unavailable = input<readonly DateRange[]>([]);
  /** N'autorise que les samedis et dimanches (matériel pro le week-end). */
  readonly weekendOnly = input(false);
  /** Premier jour sélectionnable (par défaut aujourd'hui). */
  readonly minDate = input<IsoDate>(toIsoDate(new Date()));
  /** Plage sélectionnée, en liaison bidirectionnelle `[(selection)]`. */
  readonly selection = model<DayRange | null>(null);

  protected readonly weekdays = WEEKDAYS;
  private readonly view = signal(firstOfMonth(new Date()));

  protected readonly weeks = computed(() => {
    const v = this.view();
    return buildMonthGrid(v.getFullYear(), v.getMonth());
  });
  protected readonly monthLabel = computed(() => monthFormat.format(this.view()));
  protected readonly canGoBack = computed(
    () => this.view() > firstOfMonth(parseIsoDate(this.minDate())),
  );

  protected isDisabled(day: IsoDate): boolean {
    return (
      day < this.minDate() ||
      (this.weekendOnly() && !isWeekend(day)) ||
      isInRanges(day, this.unavailable())
    );
  }

  protected isSelected(day: IsoDate): boolean {
    const s = this.selection();
    return s !== null && day >= s.start && day <= s.end;
  }

  protected select(day: IsoDate): void {
    this.selection.set(nextSelection(this.selection(), day, (d) => this.isDisabled(d)));
  }

  protected shiftMonth(delta: number): void {
    const v = this.view();
    this.view.set(new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  protected dayNumber(day: IsoDate): number {
    return parseIsoDate(day).getDate();
  }

  protected ariaLabel(day: IsoDate): string {
    const label = dayFormat.format(parseIsoDate(day));
    return this.isDisabled(day) ? `${label}, indisponible` : label;
  }

  protected dayClass(day: CalendarDay): string {
    const s = this.selection();
    if (s && (day.date === s.start || day.date === s.end)) {
      return 'bg-emerald-600 font-semibold text-white';
    }
    if (this.isSelected(day.date)) return 'bg-emerald-100 text-emerald-900';
    if (this.isDisabled(day.date)) return 'text-slate-300 line-through';
    return `${day.inMonth ? 'text-slate-900' : 'text-slate-400'} hover:bg-slate-100`;
  }
}

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
