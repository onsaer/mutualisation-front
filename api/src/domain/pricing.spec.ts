import type { DateRange, IsoDateTime } from './index.js';
import { countPeriodDays, estimateRental, overlaps } from './pricing.js';

const range = (start: string, end: string): DateRange => ({
  start: start as IsoDateTime,
  end: end as IsoDateTime,
});

describe('tarification', () => {
  it('compte les jours d’une période et estime le prix', () => {
    const weekend = range('2026-10-16T22:00:00.000Z', '2026-10-18T21:59:00.000Z');
    expect(countPeriodDays(weekend)).toBe(2);
    const price = { amountCents: 4500, currency: 'EUR' } as const;
    expect(estimateRental({ mode: 'par_weekend', price }, 3)?.amountCents).toBe(4500);
    expect(estimateRental({ mode: 'par_jour', price }, 2)?.amountCents).toBe(9000);
    expect(estimateRental({ mode: 'par_heure', price }, 2)).toBeNull();
  });

  it('détecte les chevauchements', () => {
    const a = range('2026-10-17T00:00:00Z', '2026-10-18T23:59:00Z');
    expect(overlaps(a, range('2026-10-18T00:00:00Z', '2026-10-19T00:00:00Z'))).toBe(true);
    expect(overlaps(a, range('2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z'))).toBe(false);
  });
});
