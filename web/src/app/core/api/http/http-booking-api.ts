import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Booking, BookingId, BookingStatus, NewBooking } from '../../../shared/models';
import { BookingApi } from '../booking-api';
import { API_BASE_URL, request } from './http-api.utils';

/**
 * Implémentation de `BookingApi` sur l'API REST.
 * L'utilisateur est identifié par la session : les identifiants passés en paramètre
 * (utiles au mock) sont ignorés, le serveur ne fait pas confiance au client.
 */
@Injectable()
export class HttpBookingApi extends BookingApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/bookings`;

  override listForOwner() {
    return request(this.http.get<Booking[]>(this.base, { params: { as: 'owner' } }));
  }

  override listForRequester() {
    return request(this.http.get<Booking[]>(this.base, { params: { as: 'requester' } }));
  }

  override create(input: NewBooking) {
    return request(this.http.post<Booking>(this.base, input));
  }

  override updateStatus(id: BookingId, to: BookingStatus, _by: unknown, comment?: string) {
    return request(
      this.http.patch<Booking>(`${this.base}/${encodeURIComponent(id)}/status`, {
        status: to,
        comment,
      }),
    );
  }
}
