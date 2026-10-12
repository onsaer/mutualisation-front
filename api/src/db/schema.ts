import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  Address,
  BookingHistoryEntry,
  Company,
  Resource,
  User,
} from '../domain/index.js';

export const userRole = pgEnum('user_role', ['pro', 'particulier']);
export const resourceType = pgEnum('resource_type', ['materiel', 'espace', 'achat_groupe']);
export const resourceStatus = pgEnum('resource_status', [
  'brouillon',
  'publiee',
  'suspendue',
  'archivee',
]);
export const bookingStatus = pgEnum('booking_status', [
  'en_attente',
  'confirmee',
  'refusee',
  'annulee',
  'en_cours',
  'terminee',
  'litige',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  role: userRole('role').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  displayName: text('display_name').notNull(),
  address: jsonb('address').$type<Address>().notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  preferredLanguage: text('preferred_language').$type<User['preferredLanguage']>().notNull(),
  /** Renseigné pour les pros uniquement. */
  company: jsonb('company').$type<Company>(),
  /** Renseignés pour les particuliers uniquement. */
  firstName: text('first_name'),
  lastName: text('last_name'),
  neighbourhoodId: text('neighbourhood_id'),
  ...timestamps,
});

/** Champs propres à chaque type de ressource, stockés en JSONB. */
export type ResourceDetails = Omit<
  Resource,
  | 'id'
  | 'type'
  | 'ownerId'
  | 'ownerRole'
  | 'audience'
  | 'title'
  | 'description'
  | 'photoUrls'
  | 'address'
  | 'location'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
>;

export const resources = pgTable(
  'resources',
  {
    id: text('id').primaryKey(),
    type: resourceType('type').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    ownerRole: userRole('owner_role').notNull(),
    audience: userRole('audience').array().notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    photoUrls: text('photo_urls').array().notNull().default(sql`'{}'`),
    address: jsonb('address').$type<Address>().notNull(),
    postalCode: text('postal_code').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    status: resourceStatus('status').notNull().default('publiee'),
    /** Champs spécifiques au type (tarif, surface, seuil d'achat groupé…). */
    details: jsonb('details').$type<ResourceDetails>().notNull(),
    ...timestamps,
  },
  (t) => [
    index('resources_type_status_idx').on(t.type, t.status),
    index('resources_owner_idx').on(t.ownerId),
    index('resources_postal_code_idx').on(t.postalCode),
  ],
);

export const bookings = pgTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id),
    resourceType: resourceType('resource_type').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    requesterId: text('requester_id')
      .notNull()
      .references(() => users.id),
    requesterRole: userRole('requester_role').notNull(),
    status: bookingStatus('status').notNull().default('en_attente'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    quantity: integer('quantity'),
    totalPriceCents: integer('total_price_cents'),
    depositCents: integer('deposit_cents'),
    /** Journal des changements de statut (append-only). */
    history: jsonb('history').$type<BookingHistoryEntry[]>().notNull(),
    ...timestamps,
  },
  (t) => [
    index('bookings_resource_idx').on(t.resourceId, t.status),
    index('bookings_owner_idx').on(t.ownerId),
    index('bookings_requester_idx').on(t.requesterId),
    // Une réservation est soit une location (période), soit une participation (quantité).
    check(
      'bookings_kind_check',
      sql`(${t.resourceType} = 'achat_groupe' AND ${t.quantity} > 0 AND ${t.periodStart} IS NULL)
        OR (${t.resourceType} <> 'achat_groupe' AND ${t.periodStart} < ${t.periodEnd} AND ${t.quantity} IS NULL)`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type ResourceRow = typeof resources.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
