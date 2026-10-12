import { regionFromPostalCode } from './belgium';

describe('regionFromPostalCode', () => {
  it('déduit la région', () => {
    expect(regionFromPostalCode('1000')).toBe('bruxelles');
    expect(regionFromPostalCode('1348')).toBe('wallonie'); // Louvain-la-Neuve
    expect(regionFromPostalCode('3000')).toBe('flandre'); // Leuven
    expect(regionFromPostalCode('5000')).toBe('wallonie'); // Namur
    expect(regionFromPostalCode('9000')).toBe('flandre'); // Gent
  });

  it('rejette un code invalide', () => {
    expect(regionFromPostalCode('0999')).toBeNull();
    expect(regionFromPostalCode('10000')).toBeNull();
  });
});
