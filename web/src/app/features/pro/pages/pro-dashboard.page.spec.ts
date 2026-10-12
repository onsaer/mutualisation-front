import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingApi, ResourceApi } from '../../../core/api';
import { AuthStore } from '../../../core/auth/auth.store';
import { MockBookingApi, MockResourceApi } from '../../../core/api/mock/mock-apis';
import { DEMO_PRO_USER } from '../../../core/api/mock/mock-data';
import ProDashboardPage from './pro-dashboard.page';

const settle = () => new Promise((r) => setTimeout(r, 400));

describe('ProDashboardPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ResourceApi, useClass: MockResourceApi },
        { provide: BookingApi, useClass: MockBookingApi },
      ],
    });
    TestBed.inject(AuthStore).setUser(DEMO_PRO_USER);
  });

  it('affiche les demandes en attente et permet de les accepter', async () => {
    const fixture = TestBed.createComponent(ProDashboardPage);
    await settle();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Bonjour, Atelier Dumont SRL');
    expect(el.querySelectorAll('li button')).toHaveLength(4); // 2 demandes × 2 boutons
    expect(el.textContent).toContain('Nacelle élévatrice 12 m');

    const accept = [...el.querySelectorAll<HTMLButtonElement>('li button')].find((b) =>
      b.textContent?.includes('Accepter'),
    )!;
    accept.click();
    await settle();
    await settle();
    await fixture.whenStable();

    expect(el.querySelectorAll('li button')).toHaveLength(2);
  });
});
