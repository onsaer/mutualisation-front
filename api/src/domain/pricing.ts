import { DateRange, Money, Pricing } from './index.js';

/**
 * Règles de tarification, identiques à `shared/utils/pricing.ts` côté front.
 * Le serveur fait foi : le prix affiché au front n'est qu'une estimation.
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

/** Nombre de jours couverts par une période (début du 1er jour → fin du dernier). */
export const countPeriodDays = (period: DateRange): number =>
  Math.round(
    (new Date(period.end).getTime() - new Date(period.start).getTime() + 60_000) / 86_400_000,
  );

export const estimateRental = (pricing: Pricing, days: number): Money | null => {
  if (pricing.mode === 'gratuit') return { amountCents: 0, currency: 'EUR' };
  const units = billedUnits(pricing, days);
  return units === null ? null : { amountCents: units * pricing.price.amountCents, currency: 'EUR' };
};

export const overlaps = (a: DateRange, b: DateRange): boolean =>
  a.start <= b.end && b.start <= a.end;
