import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingApi, ResourceApi } from '../../../core/api';
import { AuthStore } from '../../../core/auth/auth.store';
import { MockBookingApi, MockResourceApi } from '../../../core/api/mock/mock-apis';
import { DEMO_PARTICULIER_USER } from '../../../core/api/mock/mock-data';
import ParticulierAchatsQuartierPage from './particulier-achats-quartier.page';
import ParticulierDashboardPage from './particulier-dashboard.page';
import ParticulierLocationWeekendPage from './particulier-location-weekend.page';
import ParticulierOutilsPage from './particulier-outils.page';

const render = async (page: Type<unknown>) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ResourceApi, useClass: MockResourceApi },
      { provide: BookingApi, useClass: MockBookingApi },
    ],
  });
  TestBed.inject(AuthStore).setUser(DEMO_PARTICULIER_USER);
  const fixture = TestBed.createComponent(page);
  await new Promise((r) => setTimeout(r, 800));
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
};

const titles = (el: HTMLElement) =>
  [...el.querySelectorAll('app-resource-card h3')].map((h) => h.textContent?.trim());

const clickChip = async (el: HTMLElement, label: string) => {
  [...el.querySelectorAll<HTMLButtonElement>('app-filter-chips button')]
    .find((b) => b.textContent?.includes(label))!
    .click();
  await new Promise((r) => setTimeout(r));
};

describe('Espace particulier', () => {
  it('le tableau de bord liste les réservations actives avec leur statut', async () => {
    const el = await render(ParticulierDashboardPage);
    expect(el.textContent).toContain('Bonjour Julie');
    expect(el.querySelectorAll('li')).toHaveLength(3);
    expect(el.textContent).toContain('Nacelle élévatrice 12 m');
    expect(el.textContent).toContain('En attente');
    expect(el.textContent).toContain('Confirmée');
  });

  it("le prêt d'outils ne montre que les annonces de particuliers", async () => {
    const el = await render(ParticulierOutilsPage);
    expect(titles(el)).toEqual([
      'Perceuse-visseuse sans fil',
      'Échelle télescopique 3,8 m',
      'Tondeuse électrique',
    ]);
    await clickChip(el, 'Prêt gratuit');
    expect(titles(el)).toHaveLength(2);
  });

  it('les achats de quartier se limitent par défaut à la commune', async () => {
    const el = await render(ParticulierAchatsQuartierPage);
    expect(titles(el)).toEqual(['Bois de chauffage sec (stère)']);
    await clickChip(el, 'Toute la Belgique');
    expect(titles(el)).toHaveLength(2);
  });

  it('la location du week-end masque le matériel pro déjà réservé', async () => {
    const el = await render(ParticulierLocationWeekendPage);
    expect(titles(el)).not.toContain('Bétonnière 160 L');
    expect(titles(el)).toContain('Ponceuse à parquet professionnelle');
    await clickChip(el, 'Tout le matériel');
    expect(titles(el)).toContain('Bétonnière 160 L');
  });
});
