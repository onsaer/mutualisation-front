import { Booking, BookingId, BookingStatus, NewBooking, User, UserId } from '../../shared/models';

/** Contrat d'accès aux réservations (voir `ResourceApi`). */
export abstract class BookingApi {
  /** Réservations reçues sur les ressources dont l'utilisateur est propriétaire. */
  abstract listForOwner(ownerId: UserId): Promise<readonly Booking[]>;

  /** Réservations demandées par l'utilisateur. */
  abstract listForRequester(requesterId: UserId): Promise<readonly Booking[]>;

  /**
   * Envoie une demande de réservation (statut `en_attente`) ou rejoint un achat groupé.
   * Rejette avec un message lisible si la période n'est plus disponible.
   */
  abstract create(input: NewBooking, requester: User): Promise<Booking>;

  /**
   * Change le statut d'une réservation et ajoute l'entrée d'historique.
   * Rejette si la transition n'est pas autorisée (`BOOKING_TRANSITIONS`).
   */
  abstract updateStatus(
    id: BookingId,
    to: BookingStatus,
    by: UserId,
    comment?: string,
  ): Promise<Booking>;
}
