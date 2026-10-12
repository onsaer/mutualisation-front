import { Logger } from '@nestjs/common';
import type { Address, GeoPoint } from '../domain/index.js';

/**
 * Transforme une adresse belge en coordonnées. Une adresse introuvable ou un service
 * indisponible renvoie `null` : l'annonce est publiée quand même, sans distance affichée.
 */
export abstract class Geocoder {
  abstract geocode(address: Address): Promise<GeoPoint | null>;
}

/** Géocodage désactivé (`GEOCODER=none`). */
export class NoGeocoder extends Geocoder {
  override geocode(): Promise<GeoPoint | null> {
    return Promise.resolve(null);
  }
}

/**
 * Géocodeur compatible Nominatim (OpenStreetMap). Le service public
 * nominatim.openstreetmap.org convient pour démarrer (1 requête par seconde au maximum,
 * identification obligatoire) ; à fort trafic, utiliser une instance hébergée ou un
 * fournisseur commercial compatible.
 */
export class NominatimGeocoder extends Geocoder {
  private readonly logger = new Logger('Geocoder');
  private readonly cache = new Map<string, GeoPoint | null>();
  /** File d'attente : une requête à la fois, espacées d'une seconde (politique d'usage). */
  private queue: Promise<unknown> = Promise.resolve();
  private last = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly timeoutMs = 5000,
    private readonly minIntervalMs = 1000,
  ) {
    super();
  }

  override geocode(address: Address): Promise<GeoPoint | null> {
    const street = `${address.number} ${address.street}`.trim();
    const key =
      `${street}|${address.postalCode}|${address.municipality}`.toLowerCase();
    if (this.cache.has(key)) return Promise.resolve(this.cache.get(key)!);

    const run = this.queue.then(async () => {
      const wait = this.last + this.minIntervalMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      // Adresse complète d'abord, puis le centre de la commune si la rue n'est pas connue.
      const point =
        (await this.search({
          street,
          postalcode: address.postalCode,
          city: address.municipality,
        })) ??
        (await this.search({
          postalcode: address.postalCode,
          city: address.municipality,
        }));
      this.cache.set(key, point);
      return point;
    });
    this.queue = run.catch(() => undefined);
    return run.catch((e: unknown) => {
      this.logger.warn(`Géocodage impossible (${String(e)}).`);
      return null;
    });
  }

  private async search(
    params: Record<string, string>,
  ): Promise<GeoPoint | null> {
    const url = new URL(
      'search',
      this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`,
    );
    for (const [k, v] of Object.entries({
      ...params,
      countrycodes: 'be',
      format: 'jsonv2',
      limit: '1',
    })) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent, 'Accept-Language': 'fr' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  }
}

/**
 * `GEOCODER=nominatim` (par défaut) ou `none`. `NOMINATIM_URL` pour une autre instance,
 * `GEOCODER_USER_AGENT` pour s'identifier (exigé par le service public : nom et contact).
 */
export function geocoderFromEnv(env = process.env): Geocoder {
  if (env['GEOCODER'] === 'none') return new NoGeocoder();
  return new NominatimGeocoder(
    env['NOMINATIM_URL'] ?? 'https://nominatim.openstreetmap.org',
    env['GEOCODER_USER_AGENT'] ?? 'mutualisation-api/0.1 (developpement)',
  );
}
