import { Injectable, signal } from '@angular/core';
import { GeoPoint } from '../../shared/models';

export type NearbyStatus = 'off' | 'locating' | 'on' | 'denied' | 'unavailable';

/** Rayons proposés, en km ; `null` = toute la Belgique, triée par distance. */
export const RADIUS_OPTIONS = [5, 10, 25, null] as const;
export type Radius = (typeof RADIUS_OPTIONS)[number];

/**
 * Position de la personne pour « Autour de moi », partagée par toutes les listes.
 * La position reste dans le navigateur : elle n'est jamais envoyée à l'API.
 */
@Injectable({ providedIn: 'root' })
export class NearbyService {
  private readonly _position = signal<GeoPoint | null>(null);
  private readonly _status = signal<NearbyStatus>('off');

  readonly position = this._position.asReadonly();
  readonly status = this._status.asReadonly();
  readonly radiusKm = signal<Radius>(10);

  /** Demande la position au navigateur (une autorisation est demandée la première fois). */
  locate(): void {
    if (!('geolocation' in navigator)) {
      this._status.set('unavailable');
      return;
    }
    this._status.set('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this._position.set({ lat: coords.latitude, lng: coords.longitude });
        this._status.set('on');
      },
      (error) => {
        this._position.set(null);
        this._status.set(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      // Une précision de quartier suffit : plus rapide et moins gourmand en batterie.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  stop(): void {
    this._position.set(null);
    this._status.set('off');
  }
}
