import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideApi } from './core/api/provide-api';
import { AUTH_CONFIG } from './core/auth/auth.config';
import { AuthService } from './core/auth/auth.service';
import { MemoryLocationStrategy } from './core/routing/memory-location-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...(environment.routing === 'memory'
      ? [{ provide: LocationStrategy, useClass: MemoryLocationStrategy }]
      : []),
    provideApi({ mode: environment.apiMode, baseUrl: environment.apiBaseUrl }),
    { provide: AUTH_CONFIG, useValue: environment.auth },
    // Reprend la session de l'onglet avant la première navigation (les gardes en dépendent).
    provideAppInitializer(() => inject(AuthService).restore()),
    provideServiceWorker('ngsw-worker.js', {
      // Pas de service worker en démo : l'hébergement de fichiers statiques ne le permet pas.
      enabled: !isDevMode() && environment.routing !== 'memory',
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
