import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { NewBookingInput } from '../common/schemas.js';
import { DB, type Database } from '../db/database.js';
import { toBooking, toResource } from '../db/mappers.js';
import { bookings, resources } from '../db/schema.js';
import {
  type Booking,
  type BookingHistoryEntry,
  type BookingStatus,
  canTransition,
  countPeriodDays,
  estimateRental,
  type IsoDateTime,
  overlaps,
  type User,
} from '../domain/index.js';
import { BLOCKING_STATUSES } from '../resources/resources.service.js';

/** Qui a le droit de faire passer une réservation vers chaque statut. */
const ALLOWED_ACTOR: Record<BookingStatus, 'owner' | 'requester' | 'both'> = {
  en_attente: 'both',
  confirmee: 'owner',
  refusee: 'owner',
  en_cours: 'owner',
  terminee: 'owner',
  annulee: 'requester',
  litige: 'both',
};

@Injectable()
export class BookingsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(user: User, as: 'requester' | 'owner'): Promise<Booking[]> {
    const column = as === 'owner' ? bookings.ownerId : bookings.requesterId;
    const rows = await this.db
      .select()
      .from(bookings)
      .where(eq(column, user.id))
      .orderBy(desc(bookings.createdAt));
    return rows.map(toBooking);
  }

  /**
   * Crée une demande. La ressource est verrouillée (`SELECT … FOR UPDATE`) pendant la
   * vérification, pour que deux demandes simultanées ne puissent pas prendre les mêmes dates.
   */
  async create(input: NewBookingInput, requester: User): Promise<Booking> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, input.resourceId))
        .for('update');
      if (!row || row.status !== 'publiee') throw new NotFoundException('Cette annonce n’existe plus.');
      const resource = toResource(row);
      if (resource.ownerId === requester.id) {
        throw new ForbiddenException('Vous ne pouvez pas réserver votre propre annonce.');
      }
      if (!resource.audience.includes(requester.role)) {
        throw new ForbiddenException('Cette annonce n’est pas ouverte à votre espace.');
      }

      const now = new Date();
      const at = now.toISOString() as IsoDateTime;
      const history: BookingHistoryEntry[] = [
        { at, from: null, to: 'en_attente', by: requester.id },
      ];
      const common = {
        id: `b-${randomUUID()}`,
        resourceId: resource.id,
        resourceType: resource.type,
        ownerId: resource.ownerId,
        requesterId: requester.id,
        requesterRole: requester.role,
        status: 'en_attente' as const,
        history,
        createdAt: now,
        updatedAt: now,
      };

      if (input.kind === 'achat_groupe') {
        if (resource.type !== 'achat_groupe') throw new BadRequestException('Type de réservation invalide.');
        if (resource.deadline < at) throw new ConflictException('Cet achat groupé est clôturé.');
        const left =
          resource.maxQuantity === undefined
            ? Infinity
            : resource.maxQuantity - resource.committedQuantity;
        if (input.quantity > left) throw new ConflictException(`Il reste ${left} unité(s) disponibles.`);

        const [created] = await tx
          .insert(bookings)
          .values({
            ...common,
            quantity: input.quantity,
            totalPriceCents: resource.unitPrice.amountCents * input.quantity,
          })
          .returning();
        await tx
          .update(resources)
          .set({
            details: sql`jsonb_set(${resources.details}, '{committedQuantity}', to_jsonb((${resources.details}->>'committedQuantity')::int + ${input.quantity}))`,
            updatedAt: now,
          })
          .where(eq(resources.id, resource.id));
        return toBooking(created!);
      }

      if (resource.type === 'achat_groupe') throw new BadRequestException('Type de réservation invalide.');
      const period = {
        start: new Date(input.period.start).toISOString() as IsoDateTime,
        end: new Date(input.period.end).toISOString() as IsoDateTime,
      };
      // Tolérance d'un jour : le début de la période est minuit, heure locale de l'utilisateur.
      if (new Date(period.start).getTime() < now.getTime() - 86_400_000) {
        throw new BadRequestException('La période est dans le passé.');
      }

      const taken = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.resourceId, resource.id),
            inArray(bookings.status, [...BLOCKING_STATUSES]),
            lte(bookings.periodStart, new Date(period.end)),
            gte(bookings.periodEnd, new Date(period.start)),
          ),
        )
        .limit(1);
      if (taken.length > 0 || resource.unavailable.some((u) => overlaps(u, period))) {
        throw new ConflictException('Ces dates ne sont plus disponibles. Choisissez une autre période.');
      }

      const total = estimateRental(resource.pricing, countPeriodDays(period));
      const [created] = await tx
        .insert(bookings)
        .values({
          ...common,
          periodStart: new Date(period.start),
          periodEnd: new Date(period.end),
          totalPriceCents: total?.amountCents ?? null,
          depositCents: resource.deposit?.amountCents ?? null,
        })
        .returning();
      return toBooking(created!);
    });
  }

  /** Change le statut en respectant la machine à états et le rôle de chacun. */
  async changeStatus(id: string, to: BookingStatus, user: User, comment?: string): Promise<Booking> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(bookings).where(eq(bookings.id, id)).for('update');
      if (!row) throw new NotFoundException('Réservation introuvable.');

      const role =
        row.ownerId === user.id ? 'owner' : row.requesterId === user.id ? 'requester' : null;
      if (!role) throw new NotFoundException('Réservation introuvable.');
      const allowed = ALLOWED_ACTOR[to];
      if (allowed !== 'both' && allowed !== role) {
        throw new ForbiddenException('Vous ne pouvez pas effectuer cette action.');
      }
      if (!canTransition(row.status, to)) {
        throw new ConflictException(`Impossible de passer de « ${row.status} » à « ${to} ».`);
      }

      const now = new Date();
      const entry: BookingHistoryEntry = {
        at: now.toISOString() as IsoDateTime,
        from: row.status,
        to,
        by: user.id,
        ...(comment && { comment }),
      };
      const [updated] = await tx
        .update(bookings)
        .set({ status: to, history: [...row.history, entry], updatedAt: now })
        .where(eq(bookings.id, id))
        .returning();
      return toBooking(updated!);
    });
  }
}
