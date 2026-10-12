import { DateRange, DayRange, IsoDate } from '../../models';

/** Un jour affiché dans la grille du calendrier. */
export interface CalendarDay {
  readonly date: IsoDate;
  /** `false` pour les jours du mois précédent / suivant qui complètent la grille. */
  readonly inMonth: boolean;
  readonly isWeekend: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Convertit une `Date` en date calendaire locale `YYYY-MM-DD`. */
export const toIsoDate = (d: Date): IsoDate =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` as IsoDate;

/** Convertit `YYYY-MM-DD` en `Date` locale à minuit. */
export const parseIsoDate = (s: IsoDate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

export const addDays = (s: IsoDate, days: number): IsoDate => {
  const d = parseIsoDate(s);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/** Samedi ou dimanche. */
export const isWeekend = (s: IsoDate): boolean => {
  const day = parseIsoDate(s).getDay();
  return day === 0 || day === 6;
};

/**
 * Grille d'un mois, semaines commençant le lundi (usage belge).
 * @param month0 mois de 0 (janvier) à 11.
 */
export const buildMonthGrid = (year: number, month0: number): CalendarDay[][] => {
  const first = new Date(year, month0, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);
  let cursor = toIsoDate(new Date(year, month0, 1 - offset));

  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: cursor,
        inMonth: parseIsoDate(cursor).getMonth() === month0,
        isWeekend: isWeekend(cursor),
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
};

/** Vrai si le jour chevauche une période indisponible (bornes incluses, en heure locale). */
export const isInRanges = (day: IsoDate, ranges: readonly DateRange[]): boolean =>
  ranges.some((r) => day >= toIsoDate(new Date(r.start)) && day <= toIsoDate(new Date(r.end)));

/**
 * Calcule la nouvelle sélection après un clic.
 * - Premier clic : sélection d'un seul jour.
 * - Second clic après ce jour : étend la plage, si aucun jour bloqué ne se trouve entre les deux.
 * - Sinon : on recommence une sélection sur le jour cliqué.
 */
export const nextSelection = (
  current: DayRange | null,
  clicked: IsoDate,
  isDisabled: (day: IsoDate) => boolean,
): DayRange => {
  if (current && current.start === current.end && clicked > current.start) {
    let day = addDays(current.start, 1);
    let blocked = false;
    while (day < clicked && !blocked) {
      blocked = isDisabled(day);
      day = addDays(day, 1);
    }
    if (!blocked) return { start: current.start, end: clicked };
  }
  return { start: clicked, end: clicked };
};
