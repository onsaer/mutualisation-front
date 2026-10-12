import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, arrayContains, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type {
  NewResourceInput,
  resourceQuerySchema,
} from '../common/schemas.js';
import { DB, type Database } from '../db/database.js';
import { splitResource, toResource } from '../db/mappers.js';
import { bookings, resources } from '../db/schema.js';
import { Geocoder } from '../geo/geocoder.js';
import { PhotoStorage } from '../photos/photo-storage.js';
import type {
  DateRange,
  IsoDateTime,
  Resource,
  User,
} from '../domain/index.js';

/** Statuts qui bloquent le calendrier d'une ressource. */
export const BLOCKING_STATUSES = [
  'en_attente',
  'confirmee',
  'en_cours',
] as const;

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(Geocoder) private readonly geocoder: Geocoder,
    @Inject(PhotoStorage) private readonly photos: PhotoStorage,
  ) {}

  async list(q: z.infer<typeof resourceQuerySchema>): Promise<Resource[]> {
    const where: SQL[] = [
      eq(resources.type, q.type),
      eq(resources.status, 'publiee'),
    ];
    if (q.audience) where.push(arrayContains(resources.audience, [q.audience]));
    if (q.ownerRole) where.push(eq(resources.ownerRole, q.ownerRole));
    if (q.ownerId) where.push(eq(resources.ownerId, q.ownerId));
    const rows = await this.db
      .select()
      .from(resources)
      .where(and(...where))
      .orderBy(desc(resources.createdAt));
    return rows.map(toResource);
  }

  /**
   * Détail d'une ressource. Les périodes indisponibles incluent les réservations
   * en cours, pour que le calendrier du front soit à jour.
   */
  async get(id: string): Promise<Resource> {
    const [row] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Cette annonce n’existe plus.');
    const resource = toResource(row);
    if (resource.type === 'achat_groupe') return resource;

    const booked = await this.db
      .select({ start: bookings.periodStart, end: bookings.periodEnd })
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, id),
          inArray(bookings.status, [...BLOCKING_STATUSES]),
        ),
      );
    const periods: DateRange[] = booked.map((b) => ({
      start: b.start!.toISOString() as IsoDateTime,
      end: b.end!.toISOString() as IsoDateTime,
    }));
    return { ...resource, unavailable: [...resource.unavailable, ...periods] };
  }

  async create(input: NewResourceInput, owner: User): Promise<Resource> {
    if (!input.photoUrls.every((url) => this.photos.isOwnUrl(url))) {
      throw new BadRequestException(
        'Ajoutez les photos via l’envoi de photos de l’application.',
      );
    }
    const now = new Date().toISOString() as IsoDateTime;
    const resource = {
      ...input,
      id: `r-${randomUUID()}`,
      ownerId: owner.id,
      ownerRole: owner.role,
      status: 'publiee',
      location: await this.geocoder.geocode(input.address),
      createdAt: now,
      updatedAt: now,
    } as unknown as Resource;
    const [row] = await this.db
      .insert(resources)
      .values(splitResource(resource))
      .returning();
    // Relu depuis la base pour renvoyer la position arrondie, comme les autres routes.
    return toResource(row!);
  }
}
