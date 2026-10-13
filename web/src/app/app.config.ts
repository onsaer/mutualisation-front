import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideApi } from './core/api/provide-api';
import { AUTH_CONFIG } from './core/auth/auth.config';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      ...(environment.hashRouting ? [withHashLocation()] : []),
    ),
    provideApi({ mode: environment.apiMode, baseUrl: environment.apiBaseUrl }),
    { provide: AUTH_CONFIG, useValue: environment.auth },
    // Reprend la session de l'onglet avant la première navigation (les gardes en dépendent).
    provideAppInitializer(() => inject(AuthService).restore()),
    provideServiceWorker('ngsw-worker.js', {
      // Pas de service worker en démo : l'hébergement de fichiers statiques ne le permet pas.
      enabled: !isDevMode() && !environment.hashRouting,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
