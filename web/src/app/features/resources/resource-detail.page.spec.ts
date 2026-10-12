import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingApi, ResourceApi } from '../../core/api';
import { AuthStore } from '../../core/auth/auth.store';
import { MockBookingApi, MockResourceApi } from '../../core/api/mock/mock-apis';
import { DEMO_PARTICULIER_USER, DEMO_PRO_USER } from '../../core/api/mock/mock-data';
import { User } from '../../shared/models';
import ResourceDetailPage from './resource-detail.page';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const render = async (resourceId: string, user: User = DEMO_PARTICULIER_USER) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ResourceApi, useClass: MockResourceApi },
      { provide: BookingApi, useClass: MockBookingApi },
    ],
  });
  TestBed.inject(AuthStore).setUser(user);
  const fixture = TestBed.createComponent(ResourceDetailPage);
  fixture.componentRef.setInput('resourceId', resourceId);
  await wait(400);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
};

const button = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text))!;

describe('ResourceDetailPage', () => {
  it('réserve des jours libres et affiche une estimation', async () => {
    const { fixture, el } = await render('r-part-3'); // tondeuse, 5 €/jour
    expect(el.querySelector('h1')?.textContent).toContain('Tondeuse électrique');
    expect(button(el, 'Choisissez vos dates').disabled).toBe(true);

    const days = [
      ...el.querySelectorAll<HTMLButtonElement>('[role=gridcell] button:not([disabled])'),
    ];
    days[0]!.click();
    await fixture.whenStable();
    days[1]!.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('2 jour(s)');
    expect(el.textContent?.replace(/\s/g, ' ')).toContain('Estimation : 10,00 €');

    button(el, 'Demander la réservation').click();
    await wait(800);
    await fixture.whenStable();
    expect(el.textContent).toContain('Demande envoyée');

    const mine = await TestBed.inject(BookingApi).listForRequester(DEMO_PARTICULIER_USER.id);
    expect(mine.some((b) => b.resourceId === 'r-part-3' && b.status === 'en_attente')).toBe(true);
  });

  it('rejoint un achat groupé avec une quantité', async () => {
    const { fixture, el } = await render('r-part-6'); // bois de chauffage, 95 €/stère
    el.querySelector<HTMLButtonElement>('button[aria-label=Plus]')!.click();
    await fixture.whenStable();
    expect(el.textContent?.replace(/\s/g, ' ')).toContain('190,00 €');
    button(el, 'Rejoindre pour 2').click();
    await wait(800);
    await fixture.whenStable();
    expect(el.textContent).toContain('Votre participation est enregistrée');
    expect(el.textContent).toContain('13 / 15 réservés');
  });

  it('explique pourquoi on ne peut pas réserver', async () => {
    const own = await render('r-mat-1', DEMO_PRO_USER);
    expect(own.el.textContent).toContain("C'est votre annonce.");
  });

  it('refuse une annonce réservée aux professionnels', async () => {
    const { el } = await render('r-esp-2');
    expect(el.textContent).toContain('réservée aux professionnels');
  });
});
