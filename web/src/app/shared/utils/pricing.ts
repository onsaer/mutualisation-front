import { DateRange, DayRange, Money, Pricing } from '../models';
import { addDays, parseIsoDate } from '../ui/calendar/calendar.utils';

/** Nombre de jours d'une plage, bornes incluses. */
export const countDays = (range: DayRange): number =>
  Math.round(
    (parseIsoDate(range.end).getTime() - parseIsoDate(range.start).getTime()) / 86_400_000,
  ) + 1;

/**
 * Nombre d'unités facturées pour une location.
 * Règles métier (à valider) : un week-end couvre jusqu'à 3 jours (vendredi → dimanche),
 * un mois couvre 30 jours, toute unité entamée est due.
 * Le tarif horaire n'a pas d'estimation automatique (`null`).
 */
export const billedUnits = (pricing: Pricing, days: number): number | null => {
  switch (pricing.mode) {
    case 'gratuit':
      return 0;
    case 'par_jour':
      return days;
    case 'par_weekend':
      return Math.ceil(days / 3);
    case 'par_mois':
      return Math.ceil(days / 30);
    case 'par_heure':
      return null;
  }
};

/** Nombre de jours couverts par une période horodatée (même calcul que le serveur). */
export const countPeriodDays = (period: DateRange): number =>
  Math.round(
    (new Date(period.end).getTime() - new Date(period.start).getTime() + 60_000) / 86_400_000,
  );

/** Prix estimé d'une location de `days` jours, ou `null` s'il est à convenir (tarif horaire). */
export const estimateRental = (pricing: Pricing, days: number): Money | null => {
  if (pricing.mode === 'gratuit') return { amountCents: 0, currency: 'EUR' };
  const units = billedUnits(pricing, days);
  return units === null
    ? null
    : { amountCents: units * pricing.price.amountCents, currency: 'EUR' };
};

/** Convertit des jours calendaires en période horodatée (début 00:00, fin 23:59, heure locale). */
export const dayRangeToDateRange = (range: DayRange): DateRange => {
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(addDays(range.end, 1));
  end.setMinutes(-1);
  return {
    start: start.toISOString() as DateRange['start'],
    end: end.toISOString() as DateRange['end'],
  };
};

/** Vrai si deux périodes se chevauchent. */
export const overlaps = (a: DateRange, b: DateRange): boolean =>
  a.start <= b.end && b.start <= a.end;
