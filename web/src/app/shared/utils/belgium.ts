import { BelgianRegion } from '../models';

/** Code postal belge : 4 chiffres, de 1000 à 9999. */
export const BELGIAN_POSTAL_CODE = /^[1-9]\d{3}$/;

/**
 * Région déduite du code postal (découpage de bpost) :
 * 1000-1299 Bruxelles, 1300-1499 et 4000-7999 Wallonie, le reste Flandre.
 */
export const regionFromPostalCode = (postalCode: string): BelgianRegion | null => {
  if (!BELGIAN_POSTAL_CODE.test(postalCode)) return null;
  const code = Number(postalCode);
  if (code < 1300) return 'bruxelles';
  if (code < 1500 || (code >= 4000 && code < 8000)) return 'wallonie';
  return 'flandre';
};
