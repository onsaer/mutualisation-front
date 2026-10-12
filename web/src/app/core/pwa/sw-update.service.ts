import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Signale qu'une nouvelle version de l'app est prête (service worker). */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly _updateReady = signal(false);
  readonly updateReady = this._updateReady.asReadonly();

  constructor() {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this._updateReady.set(true));
  }

  activate(): void {
    document.location.reload();
  }
}
