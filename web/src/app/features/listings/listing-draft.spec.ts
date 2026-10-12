import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { DEMO_PARTICULIER_USER, DEMO_PRO_USER } from '../../core/api/mock/mock-data';
import { emptyDraft, ListingDraft, listingSchema, toNewResource } from './listing-draft';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const makeForm = (draft: ListingDraft) => {
  const model = signal(draft);
  const f = form(model, listingSchema, { injector: TestBed.inject(Injector) });
  return { model, f };
};

describe('listing-draft', () => {
  it("pré-remplit l'adresse et le public selon le rôle", () => {
    const pro = emptyDraft(DEMO_PRO_USER);
    expect(pro.postalCode).toBe('1040');
    expect([pro.audiencePro, pro.audienceParticulier]).toEqual([true, false]);
    const part = emptyDraft(DEMO_PARTICULIER_USER, 'espace');
    expect([part.audiencePro, part.audienceParticulier]).toEqual([false, true]);
    expect(part.pricingMode).toBe('gratuit');
    expect(part.espaceKind).toBe('cave_garage');
  });

  it('valide les champs propres au type choisi', () => {
    const { model, f } = makeForm({ ...emptyDraft(DEMO_PARTICULIER_USER), title: 'Perceuse' });
    // Matériel : la catégorie manque.
    expect(f().valid()).toBe(false);
    expect(f.category().errors()[0]?.message).toContain('catégorie');

    model.update((d) => ({ ...d, category: 'bricolage' }));
    expect(f().valid()).toBe(true);

    // Prix obligatoire dès que la formule n'est plus gratuite.
    model.update((d) => ({ ...d, pricingMode: 'par_jour' }));
    expect(f.priceEuros().valid()).toBe(false);

    // Les règles de l'achat groupé ne s'appliquent qu'à ce type.
    expect(f.productName().valid()).toBe(true);
    model.update((d) => ({ ...d, type: 'achat_groupe' }));
    expect(f.productName().valid()).toBe(false);
  });

  it('exige au moins un public et un code postal belge', () => {
    const { model, f } = makeForm({
      ...emptyDraft(DEMO_PRO_USER),
      title: 'Nacelle 12 m',
      category: 'levage',
      priceEuros: 150,
    });
    expect(f().valid()).toBe(true);
    model.update((d) => ({ ...d, audiencePro: false, postalCode: '123' }));
    expect(f.audienceParticulier().errors()[0]?.kind).toBe('audience');
    expect(f.postalCode().valid()).toBe(false);
  });

  it('convertit un achat groupé en ressource typée', () => {
    const res = toNewResource({
      ...emptyDraft(DEMO_PARTICULIER_USER, 'achat_groupe'),
      title: ' Bois de chauffage ',
      productName: 'Bois',
      unit: 'stère',
      unitPriceEuros: 95.5,
      minQuantity: 10,
      deadline: tomorrow(),
      postalCode: '5000',
    });
    expect(res.type).toBe('achat_groupe');
    if (res.type !== 'achat_groupe') return;
    expect(res.title).toBe('Bois de chauffage');
    expect(res.unitPrice).toEqual({ amountCents: 9550, currency: 'EUR' });
    expect(res.committedQuantity).toBe(0);
    expect(res.address.region).toBe('wallonie');
    expect(res.audience).toEqual(['particulier']);
  });
});
