import { inject, Injectable } from '@angular/core';
import {
  Booking,
  BookingId,
  BookingStatus,
  canTransition,
  IsoDateTime,
  Money,
  NewBooking,
  NewResource,
  Resource,
  ResourceId,
  ResourceOfType,
  ResourceType,
  User,
  UserId,
} from '../../../shared/models';
import { BookingApi } from '../booking-api';
import { PhotoApi } from '../photo-api';
import { ResourceApi, ResourceQuery } from '../resource-api';
import { countPeriodDays, estimateRental, overlaps } from '../../../shared/utils/pricing';
import { MOCK_BOOKINGS, MOCK_RESOURCES } from './mock-data';

/** Latence simulée pour voir les états de chargement. */
const delay = <T>(value: T, ms = 300) => new Promise<T>((r) => setTimeout(() => r(value), ms));

/** Implémentation en mémoire, en attendant l'API réelle. */
@Injectable()
export class MockResourceApi extends ResourceApi {
  private data: readonly Resource[] = MOCK_RESOURCES;

  override list<T extends ResourceType>(q: ResourceQuery<T>) {
    const result = this.data.filter(
      (r): r is ResourceOfType<T> =>
        r.type === q.type &&
        r.status === 'publiee' &&
        (q.audience === undefined || r.audience.includes(q.audience)) &&
        (q.ownerId === undefined || r.ownerId === q.ownerId) &&
        (q.ownerRole === undefined || r.ownerRole === q.ownerRole),
    );
    return delay(result);
  }

  override get(id: ResourceId) {
    return delay(this.data.find((r) => r.id === id) ?? null);
  }

  override create(input: NewResource, owner: User) {
    const now = new Date().toISOString() as IsoDateTime;
    const created = {
      ...input,
      id: `r-${crypto.randomUUID()}` as ResourceId,
      ownerId: owner.id,
      ownerRole: owner.role,
      status: 'publiee',
      // Démo : pas de géocodage dans le navigateur (l'API le fait), l'annonce n'a pas de position.
      location: null,
      createdAt: now,
      updatedAt: now,
    } as Resource;
    this.data = [created, ...this.data];
    return delay(created);
  }

  /** Réservé au mock des réservations : met à jour les quantités d'un achat groupé. */
  addCommitted(id: ResourceId, quantity: number): void {
    this.data = this.data.map((r) =>
      r.id === id && r.type === 'achat_groupe'
        ? { ...r, committedQuantity: r.committedQuantity + quantity }
        : r,
    );
  }
}

/** Implémentation en mémoire des réservations, mutable pour simuler les décisions. */
@Injectable()
export class MockBookingApi extends BookingApi {
  private data: Booking[] = [...MOCK_BOOKINGS];
  private readonly resources = inject(ResourceApi) as MockResourceApi;

  /** Mêmes règles que le serveur : disponibilité, public autorisé, prix calculé. */
  override async create(input: NewBooking, requester: User) {
    const resource = await this.resources.get(input.resourceId);
    if (!resource) throw new Error('Cette annonce n’existe plus.');
    if (resource.ownerId === requester.id)
      throw new Error('Vous ne pouvez pas réserver votre propre annonce.');
    if (!resource.audience.includes(requester.role)) {
      throw new Error('Cette annonce n’est pas ouverte à votre espace.');
    }
    const at = new Date().toISOString() as IsoDateTime;
    const base = {
      id: `b-${crypto.randomUUID()}` as BookingId,
      resourceId: resource.id,
      ownerId: resource.ownerId,
      requesterId: requester.id,
      requesterRole: requester.role,
      status: 'en_attente' as const,
      history: [{ at, from: null, to: 'en_attente' as const, by: requester.id }] as const,
      createdAt: at,
      updatedAt: at,
    };

    let booking: Booking;
    if (input.kind === 'achat_groupe') {
      if (resource.type !== 'achat_groupe') throw new Error('Type de réservation invalide.');
      if (resource.deadline < at) throw new Error('Cet achat groupé est clôturé.');
      const left = resource.maxQuantity
        ? resource.maxQuantity - resource.committedQuantity
        : Infinity;
      if (input.quantity < 1 || input.quantity > left)
        throw new Error(`Il reste ${left} unité(s) disponibles.`);
      const totalPrice: Money = {
        amountCents: resource.unitPrice.amountCents * input.quantity,
        currency: 'EUR',
      };
      booking = {
        ...base,
        resourceType: 'achat_groupe',
        quantity: input.quantity,
        totalPrice,
        history: [...base.history],
      };
      this.resources.addCommitted(resource.id, input.quantity);
    } else {
      if (resource.type === 'achat_groupe') throw new Error('Type de réservation invalide.');
      const period = input.period;
      const taken = [
        ...resource.unavailable,
        ...this.data
          .filter(
            (b) =>
              b.resourceId === resource.id &&
              ['en_attente', 'confirmee', 'en_cours'].includes(b.status),
          )
          .flatMap((b) => ('period' in b ? [b.period] : [])),
      ];
      if (taken.some((t) => overlaps(t, period))) {
        throw new Error('Ces dates ne sont plus disponibles. Choisissez une autre période.');
      }
      booking = {
        ...base,
        resourceType: resource.type,
        period,
        totalPrice: estimateRental(resource.pricing, countPeriodDays(period)),
        deposit: resource.deposit,
        history: [...base.history],
      };
    }
    this.data = [booking, ...this.data];
    return delay(booking);
  }

  override listForOwner(ownerId: UserId) {
    return delay(this.data.filter((b) => b.ownerId === ownerId));
  }

  override listForRequester(requesterId: UserId) {
    return delay(this.data.filter((b) => b.requesterId === requesterId));
  }

  override async updateStatus(id: BookingId, to: BookingStatus, by: UserId, comment?: string) {
    const booking = this.data.find((b) => b.id === id);
    if (!booking) throw new Error(`Réservation introuvable : ${id}`);
    if (!canTransition(booking.status, to)) {
      throw new Error(`Transition interdite : ${booking.status} → ${to}`);
    }
    const at = new Date().toISOString() as IsoDateTime;
    const updated: Booking = {
      ...booking,
      status: to,
      updatedAt: at,
      history: [...booking.history, { at, from: booking.status, to, by, comment }],
    };
    this.data = this.data.map((b) => (b.id === id ? updated : b));
    return delay(updated);
  }
}

/** Démo : la photo reste dans le navigateur le temps de la session. */
@Injectable()
export class MockPhotoApi extends PhotoApi {
  override upload(photo: Blob) {
    return delay(URL.createObjectURL(photo));
  }
}
