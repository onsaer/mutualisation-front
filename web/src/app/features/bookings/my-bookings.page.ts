import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Page provisoire : sera développée après validation de l'architecture. */
@Component({
  selector: 'app-my-bookings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="p-4 text-xl font-semibold">Mes réservations</h1>`,
})
export default class MyBookingsPage {}
