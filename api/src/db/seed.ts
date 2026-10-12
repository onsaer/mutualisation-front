import type { ProUser, ParticulierUser, User } from '../domain/index.js';
import type { Database } from './database.js';
import { splitResource } from './mappers.js';
import { bookings, resources, users } from './schema.js';
import {
  DEMO_PARTICULIER_USER,
  DEMO_PRO_USER,
  MOCK_BOOKINGS,
  MOCK_RESOURCES,
  NEIGHBOUR,
  NEIGHBOUR_2,
  OTHER_PRO,
} from './seed-data.js';

const now = DEMO_PRO_USER.createdAt;

/**
 * Comptes Keycloak de démonstration (`keycloak/mutualisation-realm.json`) liés aux profils
 * de démo : se connecter avec « julie » ou « atelier » ouvre ces profils.
 */
export const DEMO_AUTH_SUBJECTS: Record<string, string> = {
  [DEMO_PARTICULIER_USER.id]: 'b8f5c1d2-4e3a-4f6b-9c7d-1a2b3c4d5e01',
  [DEMO_PRO_USER.id]: 'b8f5c1d2-4e3a-4f6b-9c7d-1a2b3c4d5e02',
};

/** Autres comptes référencés par les annonces de démonstration. */
const OTHER_USERS: User[] = [
  {
    ...DEMO_PRO_USER,
    id: OTHER_PRO,
    email: 'info@logistique-meuse.be',
    displayName: 'Logistique Meuse',
    company: { legalName: 'Logistique Meuse SA', vatNumber: 'BE0498765432', size: 'pme' },
  } satisfies ProUser,
  {
    ...DEMO_PARTICULIER_USER,
    id: NEIGHBOUR,
    email: 'karim.b@example.be',
    displayName: 'Karim B.',
    firstName: 'Karim',
    lastName: 'Benali',
  } satisfies ParticulierUser,
  {
    ...DEMO_PARTICULIER_USER,
    id: NEIGHBOUR_2,
    email: 'an.dewit@example.be',
    displayName: 'An D.',
    firstName: 'An',
    lastName: 'De Wit',
    address: { ...DEMO_PARTICULIER_USER.address, postalCode: '1060', municipality: 'Saint-Gilles' },
  } satisfies ParticulierUser,
];

const userRow = (u: User) => ({
  id: u.id,
  authSubject: DEMO_AUTH_SUBJECTS[u.id] ?? null,
  role: u.role,
  email: u.email,
  phone: u.phone ?? null,
  displayName: u.displayName,
  address: u.address,
  verifiedAt: u.verifiedAt ? new Date(u.verifiedAt) : null,
  preferredLanguage: u.preferredLanguage,
  company: u.role === 'pro' ? u.company : null,
  firstName: u.role === 'particulier' ? u.firstName : null,
  lastName: u.role === 'particulier' ? u.lastName : null,
  neighbourhoodId: u.role === 'particulier' ? (u.neighbourhoodId ?? null) : null,
  createdAt: new Date(u.createdAt ?? now),
  updatedAt: new Date(u.updatedAt ?? now),
});

/** Remplit une base vide avec les comptes, annonces et réservations de démonstration. */
export async function seed(db: Database): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return;

  await db.insert(users).values([DEMO_PRO_USER, DEMO_PARTICULIER_USER, ...OTHER_USERS].map(userRow));
  await db.insert(resources).values(MOCK_RESOURCES.map(splitResource));
  await db.insert(bookings).values(
    MOCK_BOOKINGS.map((b) => ({
      id: b.id,
      resourceId: b.resourceId,
      resourceType: b.resourceType,
      ownerId: b.ownerId,
      requesterId: b.requesterId,
      requesterRole: b.requesterRole,
      status: b.status,
      periodStart: 'period' in b ? new Date(b.period.start) : null,
      periodEnd: 'period' in b ? new Date(b.period.end) : null,
      quantity: 'quantity' in b ? b.quantity : null,
      totalPriceCents: b.totalPrice?.amountCents ?? null,
      depositCents: 'deposit' in b && b.deposit ? b.deposit.amountCents : null,
      history: [...b.history],
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    })),
  );
}
