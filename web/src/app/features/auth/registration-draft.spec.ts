import { emptyRegistration, normalizeVat, toRegistration } from './registration-draft';

const address = {
  street: ' Rue Haute ',
  number: '3',
  postalCode: '1000',
  municipality: 'Bruxelles',
};

describe('Inscription', () => {
  it("pré-remplit le nom donné par le fournisseur d'identité", () => {
    const d = emptyRegistration({ givenName: 'Sofie', familyName: 'Peeters', verified: true });
    expect(d).toMatchObject({ role: 'particulier', firstName: 'Sofie', lastName: 'Peeters' });
  });

  it('normalise le numéro BCE', () => {
    expect(normalizeVat('be 0123.456.789')).toBe('BE0123456789');
  });

  it('construit un profil particulier avec un nom affiché par défaut', () => {
    const r = toRegistration({
      ...emptyRegistration(null),
      ...address,
      firstName: 'Sofie',
      lastName: 'Peeters',
    });
    expect(r).toEqual({
      role: 'particulier',
      displayName: 'Sofie P.',
      phone: undefined,
      firstName: 'Sofie',
      lastName: 'Peeters',
      address: {
        street: 'Rue Haute',
        number: '3',
        postalCode: '1000',
        municipality: 'Bruxelles',
        region: 'bruxelles',
        country: 'BE',
      },
    });
  });

  it("construit un profil pro avec l'entreprise", () => {
    const r = toRegistration({
      ...emptyRegistration(null),
      ...address,
      postalCode: '4000',
      role: 'pro',
      legalName: 'Menuiserie Dubois SRL',
      vatNumber: 'BE 0123.456.789',
      phone: '+32470123456',
    });
    expect(r).toMatchObject({
      role: 'pro',
      displayName: 'Menuiserie Dubois SRL',
      phone: '+32470123456',
      address: { region: 'wallonie' },
      company: { vatNumber: 'BE0123456789', size: 'tpe' },
    });
  });
});
