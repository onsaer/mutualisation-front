import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Expose l'état de connexion réseau sous forme de Signal (mode hors-ligne). */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly _online = signal(navigator.onLine);
  readonly online = this._online.asReadonly();

  constructor() {
    const update = () => this._online.set(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
