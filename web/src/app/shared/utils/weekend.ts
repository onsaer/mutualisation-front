import { DateRange, DayRange } from '../models';
import { addDays, isInRanges, toIsoDate } from '../ui/calendar/calendar.utils';

/**
 * Week-end à venir : le week-end en cours si l'on est samedi ou dimanche,
 * sinon le prochain samedi-dimanche.
 */
export const upcomingWeekend = (from = new Date()): DayRange => {
  const today = toIsoDate(from);
  const day = from.getDay();
  if (day === 6) return { start: today, end: addDays(today, 1) };
  if (day === 0) return { start: today, end: today };
  const saturday = addDays(today, 6 - day);
  return { start: saturday, end: addDays(saturday, 1) };
};

/** Vrai si aucun jour de la plage ne tombe dans une période indisponible. */
export const isFreeDuring = (unavailable: readonly DateRange[], range: DayRange): boolean => {
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) {
    if (isInRanges(day, unavailable)) return false;
  }
  return true;
};
