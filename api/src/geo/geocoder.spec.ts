import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Address } from '../domain/index.js';
import { NominatimGeocoder } from './geocoder.js';

/** Faux Nominatim : connaît la commune 4000 Liège, pas la rue. */
let server: Server;
let baseUrl: string;
const requests: URLSearchParams[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    const params = new URL(req.url!, 'http://x').searchParams;
    requests.push(params);
    res.setHeader('content-type', 'application/json');
    if (req.headers['user-agent'] !== 'test-agent')
      return res.writeHead(403).end();
    const known = !params.has('street') && params.get('postalcode') === '4000';
    res.end(JSON.stringify(known ? [{ lat: '50.6412', lon: '5.5718' }] : []));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const address = (postalCode: string): Address => ({
  street: 'Rue Inconnue',
  number: '1',
  postalCode,
  municipality: 'Liège',
  region: 'wallonie',
  country: 'BE',
});

describe('NominatimGeocoder', () => {
  it('se replie sur la commune quand la rue est inconnue, et met le résultat en cache', async () => {
    const geocoder = new NominatimGeocoder(baseUrl, 'test-agent', 1000, 0);
    requests.length = 0;
    expect(await geocoder.geocode(address('4000'))).toEqual({
      lat: 50.6412,
      lng: 5.5718,
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]!.get('street')).toBe('1 Rue Inconnue');
    expect(requests[0]!.get('countrycodes')).toBe('be');
    await geocoder.geocode(address('4000'));
    expect(requests).toHaveLength(2);
  });

  it('renvoie null si rien ne correspond ou si le service refuse', async () => {
    expect(
      await new NominatimGeocoder(baseUrl, 'test-agent', 1000, 0).geocode(
        address('9999'),
      ),
    ).toBeNull();
    expect(
      await new NominatimGeocoder(baseUrl, 'autre', 1000, 0).geocode(
        address('4000'),
      ),
    ).toBeNull();
  });
});
