import { formatMoney, formatPricing } from './format';

// Intl insère des espaces insécables : on les normalise pour comparer.
const norm = (s: string) => s.replace(/\s/g, ' ');

describe('format', () => {
  it('formate les centimes en euros (fr-BE)', () => {
    expect(norm(formatMoney({ amountCents: 1250, currency: 'EUR' }))).toBe('12,50 €');
  });

  it('formate une tarification', () => {
    expect(formatPricing({ mode: 'gratuit' })).toBe('Gratuit');
    expect(
      norm(formatPricing({ mode: 'par_weekend', price: { amountCents: 3000, currency: 'EUR' } })),
    ).toBe('30,00 € / week-end');
  });
});
