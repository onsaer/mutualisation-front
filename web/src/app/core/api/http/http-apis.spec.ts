import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingId, ResourceId } from '../../../shared/models';
import { authInterceptor } from '../../auth/auth.interceptor';
import { AuthStore } from '../../auth/auth.store';
import { DEMO_PARTICULIER_USER } from '../mock/mock-data';
import { ApiError } from './http-api.utils';
import { HttpBookingApi } from './http-booking-api';
import { HttpResourceApi } from './http-resource-api';

describe('API HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        HttpResourceApi,
        HttpBookingApi,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('construit la requête de liste et ajoute le jeton', async () => {
    TestBed.inject(AuthStore).setUser(DEMO_PARTICULIER_USER);
    const result = TestBed.inject(HttpResourceApi).list({
      type: 'materiel',
      audience: 'particulier',
    });
    const req = http.expectOne('/api/resources?type=materiel&audience=particulier');
    expect(req.request.headers.get('Authorization')).toBe('Bearer u-part-1');
    req.flush([]);
    expect(await result).toEqual([]);
  });

  it('renvoie null pour une annonce introuvable', async () => {
    const result = TestBed.inject(HttpResourceApi).get('x' as ResourceId);
    http
      .expectOne('/api/resources/x')
      .flush({ message: 'Cette annonce n’existe plus.' }, { status: 404, statusText: 'Not Found' });
    expect(await result).toBeNull();
  });

  it("relaie le message d'erreur de l'API", async () => {
    const result = TestBed.inject(HttpBookingApi).updateStatus(
      'b-1' as BookingId,
      'confirmee',
      null,
    );
    const req = http.expectOne('/api/bookings/b-1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'confirmee', comment: undefined });
    req.flush(
      { message: 'Vous ne pouvez pas effectuer cette action.' },
      { status: 403, statusText: 'Forbidden' },
    );
    await expect(result).rejects.toEqual(
      new ApiError('Vous ne pouvez pas effectuer cette action.', 403),
    );
  });
});
