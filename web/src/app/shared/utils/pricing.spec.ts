import { DayRange, IsoDate, Pricing } from '../models';
import {
  countDays,
  countPeriodDays,
  dayRangeToDateRange,
  estimateRental,
  overlaps,
} from './pricing';

const range = (start: string, end: string): DayRange => ({
  start: start as IsoDate,
  end: end as IsoDate,
});
const price = (mode: Exclude<Pricing['mode'], 'gratuit'>, euros: number): Pricing => ({
  mode,
  price: { amountCents: euros * 100, currency: 'EUR' },
});

describe('pricing', () => {
  it('compte les jours bornes incluses', () => {
    expect(countDays(range('2026-10-17', '2026-10-17'))).toBe(1);
    expect(countDays(range('2026-10-17', '2026-10-18'))).toBe(2);
    expect(countDays(range('2026-10-25', '2026-10-26'))).toBe(2); // passage à l'heure d'hiver
  });

  it('estime le prix selon la formule', () => {
    const we = 3; // vendredi → dimanche
    expect(estimateRental({ mode: 'gratuit' }, we)?.amountCents).toBe(0);
    expect(estimateRental(price('par_jour', 10), we)?.amountCents).toBe(3000);
    expect(estimateRental(price('par_weekend', 45), we)?.amountCents).toBe(4500);
    expect(
      estimateRental(price('par_mois', 90), countDays(range('2026-10-01', '2026-11-05')))
        ?.amountCents,
    ).toBe(18000);
    expect(estimateRental(price('par_heure', 20), we)).toBeNull();
  });

  it('convertit des jours en période et détecte les chevauchements', () => {
    const a = dayRangeToDateRange(range('2026-10-17', '2026-10-18'));
    const b = dayRangeToDateRange(range('2026-10-18', '2026-10-20'));
    const c = dayRangeToDateRange(range('2026-10-19', '2026-10-20'));
    expect(new Date(a.start).getDate()).toBe(17);
    expect(new Date(a.end).getDate()).toBe(18);
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(a, c)).toBe(false);
  });
});

describe('countPeriodDays', () => {
  it('donne le même résultat que les jours du calendrier', () => {
    const days = range('2026-10-24', '2026-10-26'); // inclut le changement d'heure
    expect(countPeriodDays(dayRangeToDateRange(days))).toBe(countDays(days));
  });
});
