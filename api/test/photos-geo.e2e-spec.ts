import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { Address, GeoPoint } from '../src/domain/index.js';
import { Geocoder } from '../src/geo/geocoder.js';
import { configureApp } from '../src/main.js';

/** Géocodeur de test : Liège pour 4000, introuvable sinon. */
class FakeGeocoder extends Geocoder {
  readonly calls: Address[] = [];
  override async geocode(address: Address): Promise<GeoPoint | null> {
    this.calls.push(address);
    return address.postalCode === '4000'
      ? { lat: 50.645138, lng: 5.57342 }
      : null;
  }
}

let app: INestApplication;
const geocoder = new FakeGeocoder();
const as = (userId: string) => ({ Authorization: `Bearer ${userId}` });
const http = () => request(app.getHttpServer());

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Geocoder)
    .useValue(geocoder)
    .compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
}, 30_000);

afterAll(() => app.close());

const listing = (postalCode: string, photoUrls: string[] = []) => ({
  type: 'materiel',
  title: 'Taille-haie électrique',
  audience: ['particulier'],
  address: {
    street: 'Rue de la Station',
    number: '12',
    postalCode,
    municipality: 'Liège',
    region: 'wallonie',
    country: 'BE',
  },
  category: 'jardin',
  condition: 'bon',
  pricing: { mode: 'gratuit' },
  weekendOnly: false,
  photoUrls,
});

/** Photo JPEG de 3000 × 2000 avec une position GPS dans ses métadonnées. */
const phonePhoto = () =>
  sharp({
    create: { width: 3000, height: 2000, channels: 3, background: '#4a7' },
  })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 38/1 0/1' } })
    .toBuffer();

describe('Géolocalisation', () => {
  it("géocode l'adresse et publie une position arrondie à environ 1 km", async () => {
    const res = await http()
      .post('/api/resources')
      .set(as('u-part-1'))
      .send(listing('4000'))
      .expect(201);
    expect(res.body.location).toEqual({ lat: 50.65, lng: 5.57 });
    expect(geocoder.calls.at(-1)).toMatchObject({
      street: 'Rue de la Station',
      postalCode: '4000',
    });
    const again = await http().get(`/api/resources/${res.body.id}`).expect(200);
    expect(again.body.location).toEqual({ lat: 50.65, lng: 5.57 });
  });

  it("publie quand même l'annonce si l'adresse est introuvable", async () => {
    const res = await http()
      .post('/api/resources')
      .set(as('u-part-1'))
      .send(listing('4500'))
      .expect(201);
    expect(res.body.location).toBeNull();
  });
});

describe('Photos', () => {
  it('réduit la photo, la convertit en WebP et retire la position GPS', async () => {
    const up = await http()
      .post('/api/photos')
      .set(as('u-part-1'))
      .attach('photo', await phonePhoto(), {
        filename: 'IMG_0001.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    expect(up.body.url).toMatch(/^\/api\/photos\/[0-9a-f-]{36}\.webp$/);

    const file = await http().get(up.body.url).buffer(true).expect(200);
    expect(file.headers['cache-control']).toContain('immutable');
    const meta = await sharp(file.body as Buffer).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1600, height: 1067 });
    expect(meta.exif).toBeUndefined();

    const created = await http()
      .post('/api/resources')
      .set(as('u-part-1'))
      .send(listing('4000', [up.body.url]))
      .expect(201);
    expect(created.body.photoUrls).toEqual([up.body.url]);
  });

  it("refuse l'envoi sans connexion, un fichier qui n'est pas une image et les liens externes", async () => {
    await http()
      .post('/api/photos')
      .attach('photo', Buffer.from('x'), 'a.jpg')
      .expect(401);
    const bad = await http()
      .post('/api/photos')
      .set(as('u-part-1'))
      .attach('photo', Buffer.from('%PDF-1.7 pas une image'), 'facture.jpg')
      .expect(400);
    expect(bad.body.message).toContain('Format non pris en charge');
    await http().post('/api/photos').set(as('u-part-1')).expect(400);

    const ext = await http()
      .post('/api/resources')
      .set(as('u-part-1'))
      .send(listing('4000', ['https://exemple.com/photo.jpg']))
      .expect(400);
    expect(ext.body.message).toContain('envoi de photos');
    await http().get('/api/photos/..%2Fpackage.json').expect(404);
  });

  it('refuse une photo de plus de 10 Mo', async () => {
    const res = await http()
      .post('/api/photos')
      .set(as('u-part-1'))
      .attach('photo', Buffer.alloc(10 * 1024 * 1024 + 1), 'enorme.jpg')
      .expect(413);
    expect(res.body.message).toBe('Photo trop lourde (10 Mo maximum).');
  });
});
