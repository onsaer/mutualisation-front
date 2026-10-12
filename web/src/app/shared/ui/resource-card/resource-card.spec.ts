import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AchatGroupeResource,
  IsoDateTime,
  MaterielResource,
  ResourceId,
  UserId,
} from '../../models';
import { ResourceCard } from './resource-card';

const now = '2026-10-12T00:00:00Z' as IsoDateTime;
const base = {
  id: 'r1' as ResourceId,
  ownerId: 'u1' as UserId,
  ownerRole: 'pro',
  audience: ['pro', 'particulier'],
  title: 'Perforateur Bosch',
  description: '',
  photoUrls: [],
  address: {
    street: 'Rue Neuve',
    number: '1',
    postalCode: '1000',
    municipality: 'Bruxelles',
    region: 'bruxelles',
    country: 'BE',
  },
  location: { lat: 50.85, lng: 4.35 },
  status: 'publiee',
  createdAt: now,
  updatedAt: now,
} as const;

const materiel: MaterielResource = {
  ...base,
  type: 'materiel',
  category: 'outillage',
  condition: 'bon',
  pricing: { mode: 'par_weekend', price: { amountCents: 2500, currency: 'EUR' } },
  weekendOnly: true,
  unavailable: [],
};

const achat: AchatGroupeResource = {
  ...base,
  id: 'r2' as ResourceId,
  type: 'achat_groupe',
  title: 'Terreau bio',
  productName: 'Terreau',
  unitPrice: { amountCents: 800, currency: 'EUR' },
  unit: 'sac',
  minQuantity: 20,
  committedQuantity: 5,
  deadline: now,
};

const render = async (resource: MaterielResource | AchatGroupeResource) => {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ResourceCard);
  fixture.componentRef.setInput('resource', resource);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
};

describe('ResourceCard', () => {
  it('affiche prix et mention week-end pour du matériel', async () => {
    const el = await render(materiel);
    expect(el.textContent).toContain('Perforateur Bosch');
    expect(el.textContent).toContain('/ week-end');
    expect(el.textContent).toContain('Disponible le week-end');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/ressources/r1');
  });

  it('affiche la progression pour un achat groupé', async () => {
    const el = await render(achat);
    expect(el.textContent).toContain('5 / 20 réservés');
    const bar = el.querySelector<HTMLElement>('[role=progressbar] > div')!;
    expect(bar.style.width).toBe('25%');
  });
});
