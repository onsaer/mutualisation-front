import { Resource } from '../models';

/** Minuscules sans accents, pour une recherche tolérante (« liege » trouve « Liège »). */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Recherche plein texte sur le titre, la commune et le code postal. */
export const matchesQuery = (resource: Resource, query: string): boolean => {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(
    `${resource.title} ${resource.address.municipality} ${resource.address.postalCode}`,
  );
  return q.split(/\s+/).every((word) => haystack.includes(word));
};
