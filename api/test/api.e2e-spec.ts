import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/main.js';

/** Base PGlite en mémoire, migrée et remplie avec les données de démonstration. */
let app: INestApplication;

const as = (userId: string) => ({ Authorization: `Bearer ${userId}` });

const period = (fromDays: number, days: number) => {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + fromDays);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);
  end.setUTCMinutes(-1);
  return { start: start.toISOString(), end: end.toISOString() };
};

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
}, 30_000);

afterAll(() => app.close());

const http = () => request(app.getHttpServer());

describe('Ressources', () => {
  it('filtre par type, public et écosystème du propriétaire', async () => {
    const res = await http()
      .get('/api/resources')
      .query({ type: 'materiel', audience: 'particulier', ownerRole: 'pro' })
      .expect(200);
    expect(res.body.map((r: { title: string }) => r.title).sort()).toEqual([
      'Bétonnière 160 L',
      'Nacelle élévatrice 12 m',
      'Ponceuse à parquet professionnelle',
    ]);
  });

  it('renvoie 400 si le type manque et 404 pour une annonce inconnue', async () => {
    await http().get('/api/resources').expect(400);
    const res = await http().get('/api/resources/inconnue').expect(404);
    expect(res.body.message).toBe('Cette annonce n’existe plus.');
  });

  it("publie une annonce pour l'utilisateur connecté et valide les données", async () => {
    const body = {
      type: 'espace',
      title: 'Garage partagé 15 m²',
      audience: ['particulier'],
      address: {
        street: 'Rue Haute',
        number: '3',
        postalCode: '1000',
        municipality: 'Bruxelles',
        region: 'bruxelles',
        country: 'BE',
      },
      kind: 'cave_garage',
      surfaceM2: 15,
      access: 'badge',
      pricing: { mode: 'par_mois', price: { amountCents: 6000, currency: 'EUR' } },
    };
    await http().post('/api/resources').send(body).expect(401);
    const bad = await http()
      .post('/api/resources')
      .set(as('u-part-1'))
      .send({ ...body, title: 'abc' })
      .expect(400);
    expect(bad.body.issues[0].path).toBe('title');

    const created = await http().post('/api/resources').set(as('u-part-1')).send(body).expect(201);
    expect(created.body).toMatchObject({
      ownerId: 'u-part-1',
      ownerRole: 'particulier',
      status: 'publiee',
    });
    await http().get(`/api/resources/${created.body.id}`).expect(200);
  });
});

describe('Réservations', () => {
  it('calcule le prix côté serveur et bloque une double réservation', async () => {
    const p = period(30, 2);
    const first = await http()
      .post('/api/bookings')
      .set(as('u-part-1'))
      .send({ kind: 'location', resourceId: 'r-part-3', period: p })
      .expect(201);
    expect(first.body).toMatchObject({ status: 'en_attente', totalPrice: { amountCents: 1000 } });

    const clash = await http()
      .post('/api/bookings')
      .set(as('u-part-2'))
      .send({ kind: 'location', resourceId: 'r-part-3', period: period(31, 2) })
      .expect(409);
    expect(clash.body.message).toContain('plus disponibles');

    const detail = await http().get('/api/resources/r-part-3').expect(200);
    expect(detail.body.unavailable).toContainEqual({ start: p.start, end: p.end });
  });

  it("refuse les annonces fermées à l'espace et sa propre annonce", async () => {
    await http()
      .post('/api/bookings')
      .set(as('u-pro-1'))
      .send({ kind: 'location', resourceId: 'r-part-3', period: period(40, 1) })
      .expect(403);
    await http()
      .post('/api/bookings')
      .set(as('u-pro-1'))
      .send({ kind: 'location', resourceId: 'r-mat-1', period: period(40, 1) })
      .expect(403);
  });

  it("met à jour la quantité engagée d'un achat groupé", async () => {
    const before = await http().get('/api/resources/r-part-7').expect(200);
    await http()
      .post('/api/bookings')
      .set(as('u-part-1'))
      .send({ kind: 'achat_groupe', resourceId: 'r-part-7', quantity: 3 })
      .expect(201);
    const after = await http().get('/api/resources/r-part-7').expect(200);
    expect(after.body.committedQuantity).toBe(before.body.committedQuantity + 3);
  });

  it('applique la machine à états et les droits de chacun', async () => {
    // Le demandeur ne peut pas confirmer lui-même.
    await http()
      .patch('/api/bookings/b-2/status')
      .set(as('u-pro-2'))
      .send({ status: 'confirmee' })
      .expect(403);
    // Le propriétaire refuse : transition valide, historique complété.
    const refused = await http()
      .patch('/api/bookings/b-2/status')
      .set(as('u-pro-1'))
      .send({ status: 'refusee', comment: 'Box déjà loué.' })
      .expect(200);
    expect(refused.body.history.at(-1)).toMatchObject({
      from: 'en_attente',
      to: 'refusee',
      by: 'u-pro-1',
      comment: 'Box déjà loué.',
    });
    // Une réservation refusée est définitive.
    await http()
      .patch('/api/bookings/b-2/status')
      .set(as('u-pro-1'))
      .send({ status: 'confirmee' })
      .expect(409);
    // Un tiers ne voit pas la réservation.
    await http()
      .patch('/api/bookings/b-2/status')
      .set(as('u-part-2'))
      .send({ status: 'litige' })
      .expect(404);
  });

  it('liste les demandes envoyées et reçues', async () => {
    const mine = await http().get('/api/bookings').set(as('u-part-1')).expect(200);
    expect(mine.body.length).toBeGreaterThan(0);
    expect(mine.body.every((b: { requesterId: string }) => b.requesterId === 'u-part-1')).toBe(
      true,
    );
    const received = await http()
      .get('/api/bookings')
      .query({ as: 'owner' })
      .set(as('u-pro-1'))
      .expect(200);
    expect(received.body.every((b: { ownerId: string }) => b.ownerId === 'u-pro-1')).toBe(true);
  });
});
