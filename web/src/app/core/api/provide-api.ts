import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { authInterceptor } from '../auth/auth.interceptor';
import { BookingApi } from './booking-api';
import { API_BASE_URL } from './http/http-api.utils';
import { HttpBookingApi } from './http/http-booking-api';
import { HttpResourceApi } from './http/http-resource-api';
import { MockBookingApi, MockResourceApi } from './mock/mock-apis';
import { ResourceApi } from './resource-api';

/**
 * Choisit l'implémentation des API : données fictives (`mock`) ou API REST (`http`).
 * Les pages ne dépendent que de `ResourceApi` et `BookingApi` et ne voient pas la différence.
 */
export function provideApi(config: {
  mode: 'mock' | 'http';
  baseUrl: string;
}): EnvironmentProviders {
  const providers: Provider[] =
    config.mode === 'http'
      ? [
          { provide: API_BASE_URL, useValue: config.baseUrl },
          { provide: ResourceApi, useClass: HttpResourceApi },
          { provide: BookingApi, useClass: HttpBookingApi },
        ]
      : [
          { provide: ResourceApi, useClass: MockResourceApi },
          { provide: BookingApi, useClass: MockBookingApi },
        ];
  return makeEnvironmentProviders([
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    ...providers,
  ]);
}
