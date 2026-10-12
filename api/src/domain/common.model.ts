/**
 * Types communs à tous les modèles du domaine.
 */

/** Type « marqué » : empêche de confondre deux identifiants de même type primitif. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ResourceId = Brand<string, 'ResourceId'>;
export type BookingId = Brand<string, 'BookingId'>;

/** Date-heure ISO 8601 en UTC, ex. `2026-10-12T16:00:00Z` (sérialisable, compatible cache hors-ligne). */
export type IsoDateTime = Brand<string, 'IsoDateTime'>;

/** Date calendaire locale sans heure, ex. `2026-10-12` (jours du calendrier). */
export type IsoDate = Brand<string, 'IsoDate'>;

/** Plage de jours inclusive, telle que sélectionnée dans le calendrier. */
export interface DayRange {
  readonly start: IsoDate;
  readonly end: IsoDate;
}

/** Montant en centimes pour éviter les erreurs d'arrondi sur les flottants. */
export interface Money {
  readonly amountCents: number;
  readonly currency: 'EUR';
}

/** Régions de Belgique. */
export type BelgianRegion = 'bruxelles' | 'wallonie' | 'flandre';

export interface Address {
  readonly street: string;
  readonly number: string;
  readonly box?: string;
  /** Code postal belge à 4 chiffres. */
  readonly postalCode: string;
  readonly municipality: string;
  readonly region: BelgianRegion;
  readonly country: 'BE';
}

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/** Période fermée [start, end]. */
export interface DateRange {
  readonly start: IsoDateTime;
  readonly end: IsoDateTime;
}

/** Champs d'audit présents sur toutes les entités persistées. */
export interface Timestamped {
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

/** `Omit` appliqué à chaque membre d'une union (le `Omit` natif écrase les unions discriminées). */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
