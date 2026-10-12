import {
  BookingId,
  DateRange,
  IsoDateTime,
  Money,
  ResourceId,
  Timestamped,
  UserId,
} from './common.model.js';
import { ResourceType } from './resource.model.js';
import { UserRole } from './user.model.js';

/** Cycle de vie d'une réservation. */
export type BookingStatus =
  'en_attente' | 'confirmee' | 'refusee' | 'annulee' | 'en_cours' | 'terminee' | 'litige';

/** Transitions de statut autorisées (machine à états). */
export const BOOKING_TRANSITIONS = {
  en_attente: ['confirmee', 'refusee', 'annulee'],
  confirmee: ['en_cours', 'annulee'],
  en_cours: ['terminee', 'litige'],
  terminee: ['litige'],
  litige: ['terminee'],
  refusee: [],
  annulee: [],
} as const satisfies Readonly<Record<BookingStatus, readonly BookingStatus[]>>;

export const canTransition = (from: BookingStatus, to: BookingStatus): boolean =>
  (BOOKING_TRANSITIONS[from] as readonly BookingStatus[]).includes(to);

/** Entrée d'historique : trace chaque changement de statut (journal immuable). */
export interface BookingHistoryEntry {
  readonly at: IsoDateTime;
  /** `null` pour la création. */
  readonly from: BookingStatus | null;
  readonly to: BookingStatus;
  readonly by: UserId;
  readonly comment?: string;
}

/** Champs communs. */
interface BaseBooking extends Timestamped {
  readonly id: BookingId;
  readonly resourceId: ResourceId;
  readonly ownerId: UserId;
  readonly requesterId: UserId;
  /** Écosystème du demandeur, utile pour les échanges B2B ↔ B2C. */
  readonly requesterRole: UserRole;
  readonly status: BookingStatus;
  readonly totalPrice: Money | null;
  readonly history: readonly [BookingHistoryEntry, ...BookingHistoryEntry[]];
}

/** Réservation sur une période (matériel ou espace). */
export interface RentalBooking extends BaseBooking {
  readonly resourceType: Extract<ResourceType, 'materiel' | 'espace'>;
  readonly period: DateRange;
  readonly deposit?: Money;
}

/** Participation à un achat groupé. */
export interface GroupPurchaseBooking extends BaseBooking {
  readonly resourceType: 'achat_groupe';
  readonly quantity: number;
}

/** Union discriminée sur `resourceType`. */
export type Booking = RentalBooking | GroupPurchaseBooking;

export const isRentalBooking = (booking: Booking): booking is RentalBooking =>
  booking.resourceType !== 'achat_groupe';

/** Demande de réservation envoyée par l'utilisateur (le serveur calcule prix et statut). */
export type NewBooking =
  | {
      readonly kind: 'location';
      readonly resourceId: ResourceId;
      /**
       * Période horodatée (début du premier jour → fin du dernier, heure locale de l'utilisateur),
       * obtenue avec `dayRangeToDateRange` à partir des jours choisis dans le calendrier.
       */
      readonly period: DateRange;
    }
  | {
      readonly kind: 'achat_groupe';
      readonly resourceId: ResourceId;
      readonly quantity: number;
    };
