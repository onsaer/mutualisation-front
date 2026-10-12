import { Resource } from '../models';
import { matchesQuery, normalize } from './search';

const r = {
  title: 'Ponceuse à parquet',
  address: { municipality: 'Liège', postalCode: '4000' },
} as Resource;

describe('search', () => {
  it('normalise accents et casse', () => {
    expect(normalize('  Liège ')).toBe('liege');
  });

  it('cherche dans le titre, la commune et le code postal', () => {
    expect(matchesQuery(r, '')).toBe(true);
    expect(matchesQuery(r, 'ponceuse liege')).toBe(true);
    expect(matchesQuery(r, '4000')).toBe(true);
    expect(matchesQuery(r, 'namur')).toBe(false);
  });
});
