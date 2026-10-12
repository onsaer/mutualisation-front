import { GeoPoint } from '../models';

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points, en kilomètres (formule de haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Distance lisible. Les annonces sont situées à environ 1 km près : en dessous de 2 km,
 * on ne donne pas de chiffre trompeur.
 */
export function formatDistance(km: number): string {
  if (km < 2) return 'à moins de 2 km';
  return `à ${Math.round(km)} km`;
}

/**
 * Trie des éléments géolocalisés du plus proche au plus éloigné, en écartant ceux au-delà de
 * `radiusKm`. Les éléments sans position sont gardés à la fin si aucun rayon n'est imposé.
 */
export function byDistance<T extends { readonly location: GeoPoint | null }>(
  items: readonly T[],
  from: GeoPoint,
  radiusKm: number | null,
): { readonly item: T; readonly distanceKm: number | null }[] {
  const located = items
    .filter((item) => item.location !== null)
    .map((item) => ({ item, distanceKm: distanceKm(from, item.location!) }))
    .filter((x) => radiusKm === null || x.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const unlocated =
    radiusKm === null
      ? items.filter((item) => item.location === null).map((item) => ({ item, distanceKm: null }))
      : [];
  return [...located, ...unlocated];
}
