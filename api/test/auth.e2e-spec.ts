import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AUTH_CONFIG, type AuthConfig } from '../src/auth/auth.config.js';
import { DEMO_AUTH_SUBJECTS } from '../src/db/seed.js';
import { configureApp } from '../src/main.js';

/**
 * Mode OpenID Connect : un faux fournisseur d'identité publie sa clé publique (JWKS) sur un port
 * local et signe des jetons comme le ferait Keycloak.
 */
const ISSUER = 'https://idp.test/realms/mutualisation';
let app: INestApplication;
let jwksServer: Server;
let privateKey: CryptoKey;

const token = (
  sub: string,
  claims: Record<string, unknown> = {},
  opts: { audience?: string; issuer?: string; key?: CryptoKey } = {},
) =>
  new SignJWT({ email: `${sub}@exemple.be`, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject(sub)
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? 'mutualisation-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(opts.key ?? privateKey);

const bearer = async (...args: Parameters<typeof token>) => ({
  Authorization: `Bearer ${await token(...args)}`,
});

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  const jwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: 'test',
    alg: 'RS256',
    use: 'sig',
  };
  jwksServer = createServer((_, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) =>
    jwksServer.listen(0, '127.0.0.1', resolve),
  );
  const { port } = jwksServer.address() as AddressInfo;

  const config: AuthConfig = {
    mode: 'oidc',
    issuer: ISSUER,
    audience: 'mutualisation-api',
    jwksUrl: `http://127.0.0.1:${port}/certs`,
    verifiedIdentityProvider: 'itsme',
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AUTH_CONFIG)
    .useValue(config)
    .compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
}, 30_000);

afterAll(async () => {
  await app.close();
  jwksServer.close();
});

const http = () => request(app.getHttpServer());

const address = {
  street: 'Rue de la Station',
  number: '12',
  postalCode: '4000',
  municipality: 'Liège',
  region: 'wallonie',
  country: 'BE',
};

describe('Connexion OpenID Connect', () => {
  it('retrouve un compte existant par son identifiant chez le fournisseur', async () => {
    const res = await http()
      .get('/api/me')
      .set(await bearer(DEMO_AUTH_SUBJECTS['u-part-1']!))
      .expect(200);
    expect(res.body).toMatchObject({ id: 'u-part-1', role: 'particulier' });
  });

  it("refuse l'ancien jeton de démo, une mauvaise audience, un autre émetteur ou une autre clé", async () => {
    await http()
      .get('/api/me')
      .set({ Authorization: 'Bearer u-part-1' })
      .expect(401);
    const sub = DEMO_AUTH_SUBJECTS['u-part-1']!;
    await http()
      .get('/api/me')
      .set(await bearer(sub, {}, { audience: 'autre-api' }))
      .expect(401);
    await http()
      .get('/api/me')
      .set(await bearer(sub, {}, { issuer: 'https://pirate.test' }))
      .expect(401);
    const { privateKey: otherKey } = await generateKeyPair('RS256');
    await http()
      .get('/api/me')
      .set(await bearer(sub, {}, { key: otherKey }))
      .expect(401);
  });

  it("demande l'inscription à une nouvelle personne, puis crée son profil vérifié via itsme", async () => {
    const auth = await bearer('nouvelle-1', {
      identity_provider: 'itsme',
      given_name: 'Sofie',
      family_name: 'Peeters',
    });
    const missing = await http().get('/api/me').set(auth).expect(403);
    expect(missing.body.code).toBe('PROFILE_REQUIRED');
    await http().get('/api/bookings').set(auth).expect(403);

    const created = await http()
      .post('/api/me')
      .set(auth)
      .send({
        role: 'particulier',
        displayName: 'Sofie P.',
        firstName: 'Sofie',
        lastName: 'Peeters',
        address,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      role: 'particulier',
      email: 'nouvelle-1@exemple.be',
      preferredLanguage: 'fr',
    });
    expect(created.body.verifiedAt).not.toBeNull();

    await http().get('/api/me').set(auth).expect(200);
    await http().get('/api/bookings').set(auth).expect(200);
    const again = await http()
      .post('/api/me')
      .set(auth)
      .send({
        role: 'particulier',
        displayName: 'X Y',
        firstName: 'X',
        lastName: 'Y',
        address,
      })
      .expect(409);
    expect(again.body.message).toBe('Votre profil existe déjà.');
  });

  it('inscrit un pro non vérifié et valide son numéro BCE', async () => {
    const auth = await bearer('nouveau-pro', { identity_provider: 'google' });
    const body = {
      role: 'pro',
      displayName: 'Menuiserie Dubois',
      address,
      company: {
        legalName: 'Menuiserie Dubois SRL',
        vatNumber: 'BE 0123.456.789',
        size: 'tpe',
      },
    };
    const bad = await http()
      .post('/api/me')
      .set(auth)
      .send({ ...body, company: { ...body.company, vatNumber: '123' } })
      .expect(400);
    expect(bad.body.issues[0].path).toBe('company.vatNumber');

    const created = await http()
      .post('/api/me')
      .set(auth)
      .send(body)
      .expect(201);
    expect(created.body).toMatchObject({
      role: 'pro',
      verifiedAt: null,
      company: { vatNumber: 'BE0123456789' },
    });
  });
});
