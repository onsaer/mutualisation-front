import type { Booking, IsoDateTime, Resource, User } from '../domain/index.js';
import type { BookingRow, ResourceRow, UserRow } from './schema.js';

const iso = (d: Date) => d.toISOString() as IsoDateTime;

/** Ligne SQL → modèle du domaine (le même que celui du front). */
export const toResource = (r: ResourceRow): Resource =>
  ({
    ...r.details,
    id: r.id,
    type: r.type,
    ownerId: r.ownerId,
    ownerRole: r.ownerRole,
    audience: r.audience,
    title: r.title,
    description: r.description,
    photoUrls: r.photoUrls,
    address: r.address,
    location: { lat: r.lat, lng: r.lng },
    status: r.status,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  }) as unknown as Resource;

export const toBooking = (b: BookingRow): Booking => {
  const base = {
    id: b.id,
    resourceId: b.resourceId,
    ownerId: b.ownerId,
    requesterId: b.requesterId,
    requesterRole: b.requesterRole,
    status: b.status,
    totalPrice:
      b.totalPriceCents === null ? null : { amountCents: b.totalPriceCents, currency: 'EUR' },
    history: b.history,
    createdAt: iso(b.createdAt),
    updatedAt: iso(b.updatedAt),
  };
  return (
    b.resourceType === 'achat_groupe'
      ? { ...base, resourceType: 'achat_groupe', quantity: b.quantity }
      : {
          ...base,
          resourceType: b.resourceType,
          period: { start: iso(b.periodStart!), end: iso(b.periodEnd!) },
          ...(b.depositCents !== null && {
            deposit: { amountCents: b.depositCents, currency: 'EUR' },
          }),
        }
  ) as unknown as Booking;
};

export const toUser = (u: UserRow): User => {
  const base = {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    address: u.address,
    verifiedAt: u.verifiedAt ? iso(u.verifiedAt) : null,
    preferredLanguage: u.preferredLanguage,
    createdAt: iso(u.createdAt),
    updatedAt: iso(u.updatedAt),
    ...(u.phone && { phone: u.phone }),
  };
  return (
    u.role === 'pro'
      ? { ...base, role: 'pro', company: u.company }
      : {
          ...base,
          role: 'particulier',
          firstName: u.firstName,
          lastName: u.lastName,
          ...(u.neighbourhoodId && { neighbourhoodId: u.neighbourhoodId }),
        }
  ) as unknown as User;
};

/** Sépare les champs communs (colonnes) des champs propres au type (JSONB `details`). */
export const splitResource = (r: Resource) => {
  const {
    id,
    type,
    ownerId,
    ownerRole,
    audience,
    title,
    description,
    photoUrls,
    address,
    location,
    status,
    createdAt,
    updatedAt,
    ...details
  } = r;
  return {
    id,
    type,
    ownerId,
    ownerRole,
    audience: [...audience],
    title,
    description,
    photoUrls: [...photoUrls],
    address,
    postalCode: address.postalCode,
    lat: location.lat,
    lng: location.lng,
    status,
    details,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
  };
};
