import { byDistance, distanceKm, formatDistance } from './geo';

const BRUXELLES = { lat: 50.8467, lng: 4.3525 };
const LIEGE = { lat: 50.6326, lng: 5.5797 };
const NAMUR = { lat: 50.4669, lng: 4.8675 };

describe('Distances', () => {
  it('calcule la distance à vol d’oiseau', () => {
    expect(distanceKm(BRUXELLES, LIEGE)).toBeCloseTo(89.5, 0);
    expect(distanceKm(BRUXELLES, BRUXELLES)).toBe(0);
  });

  it('arrondit sans fausse précision', () => {
    expect(formatDistance(0.4)).toBe('à moins de 2 km');
    expect(formatDistance(12.6)).toBe('à 13 km');
  });

  it('trie par distance, applique le rayon et garde les annonces sans position à la fin', () => {
    const items = [
      { id: 'liege', location: LIEGE },
      { id: 'inconnue', location: null },
      { id: 'namur', location: NAMUR },
    ];
    expect(byDistance(items, BRUXELLES, null).map((x) => x.item.id)).toEqual([
      'namur',
      'liege',
      'inconnue',
    ]);
    expect(byDistance(items, BRUXELLES, 60).map((x) => x.item.id)).toEqual(['namur']);
  });
});
