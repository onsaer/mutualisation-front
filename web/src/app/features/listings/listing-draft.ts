import {
  applyWhen,
  maxLength,
  min,
  minLength,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import {
  EspaceResource,
  EspaceKind,
  IsoDateTime,
  MaterielCondition,
  Money,
  NewResource,
  Pricing,
  ResourceType,
  User,
  UserRole,
} from '../../shared/models';
import { BELGIAN_POSTAL_CODE, regionFromPostalCode } from '../../shared/utils/belgium';

/**
 * Modèle « à plat » du formulaire de publication.
 * Les montants sont saisis en euros (`number | null` pour un champ vide)
 * et convertis en `Money` (centimes) à l'envoi par `toNewResource`.
 */
export interface ListingDraft {
  type: ResourceType;
  title: string;
  description: string;
  audiencePro: boolean;
  audienceParticulier: boolean;
  street: string;
  number: string;
  postalCode: string;
  municipality: string;

  // Matériel et espace
  pricingMode: Pricing['mode'];
  priceEuros: number | null;
  depositEuros: number | null;

  // Matériel
  category: string;
  condition: MaterielCondition;
  weekendOnly: boolean;

  // Espace
  espaceKind: EspaceKind;
  surfaceM2: number | null;
  access: EspaceResource['access'];

  // Achat groupé
  productName: string;
  unit: string;
  unitPriceEuros: number | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  /** Date de clôture `YYYY-MM-DD` (champ `<input type="date">`). */
  deadline: string;
}

/** Brouillon initial, pré-rempli avec l'adresse et l'écosystème de l'utilisateur. */
export const emptyDraft = (user: User | null, type: ResourceType = 'materiel'): ListingDraft => ({
  type,
  title: '',
  description: '',
  audiencePro: user?.role !== 'particulier',
  audienceParticulier: user?.role !== 'pro',
  street: user?.address.street ?? '',
  number: user?.address.number ?? '',
  postalCode: user?.address.postalCode ?? '',
  municipality: user?.address.municipality ?? '',
  pricingMode: user?.role === 'particulier' ? 'gratuit' : 'par_jour',
  priceEuros: null,
  depositEuros: null,
  category: '',
  condition: 'bon',
  weekendOnly: false,
  espaceKind: user?.role === 'particulier' ? 'cave_garage' : 'stockage',
  surfaceM2: null,
  access: 'sur_rendez_vous',
  productName: '',
  unit: '',
  unitPriceEuros: null,
  minQuantity: null,
  maxQuantity: null,
  deadline: '',
});

const isRental = (type: ResourceType) => type !== 'achat_groupe';

/** Règles de validation, appliquées selon le type d'annonce choisi. */
export const listingSchema = schema<ListingDraft>((p) => {
  required(p.title, { message: 'Donnez un titre à votre annonce.' });
  minLength(p.title, 5, { message: 'Au moins 5 caractères.' });
  maxLength(p.title, 80, { message: '80 caractères maximum.' });
  maxLength(p.description, 1000, { message: '1000 caractères maximum.' });

  required(p.street, { message: 'Indiquez la rue.' });
  required(p.municipality, { message: 'Indiquez la commune.' });
  required(p.postalCode, { message: 'Indiquez le code postal.' });
  pattern(p.postalCode, BELGIAN_POSTAL_CODE, { message: 'Code postal belge à 4 chiffres.' });
  maxLength(p.postalCode, 4);

  validate(p.audienceParticulier, ({ value, valueOf }) =>
    value() || valueOf(p.audiencePro)
      ? undefined
      : { kind: 'audience', message: 'Choisissez au moins un public.' },
  );

  applyWhen(
    p,
    ({ value }) => isRental(value().type),
    (r) => {
      required(r.priceEuros, {
        message: 'Indiquez un prix.',
        when: ({ valueOf }) => valueOf(r.pricingMode) !== 'gratuit',
      });
      min(r.priceEuros, 0.5, { message: 'Minimum 0,50 €.' });
      min(r.depositEuros, 0, { message: 'La caution ne peut pas être négative.' });
    },
  );

  applyWhen(
    p,
    ({ value }) => value().type === 'materiel',
    (m) => {
      required(m.category, { message: 'Indiquez une catégorie (ex. bricolage, jardin).' });
    },
  );

  applyWhen(
    p,
    ({ value }) => value().type === 'espace',
    (e) => {
      required(e.surfaceM2, { message: 'Indiquez la surface.' });
      min(e.surfaceM2, 1, { message: 'Au moins 1 m².' });
    },
  );

  applyWhen(
    p,
    ({ value }) => value().type === 'achat_groupe',
    (a) => {
      required(a.productName, { message: 'Indiquez le produit.' });
      required(a.unit, { message: 'Indiquez l’unité (ex. sac, lot, stère).' });
      required(a.unitPriceEuros, { message: 'Indiquez le prix unitaire.' });
      min(a.unitPriceEuros, 0.01, { message: 'Le prix doit être positif.' });
      required(a.minQuantity, { message: 'Indiquez le seuil de commande.' });
      min(a.minQuantity, 2, { message: 'Un achat groupé demande au moins 2 unités.' });
      validate(a.maxQuantity, ({ value, valueOf }) => {
        const max = value();
        const minQ = valueOf(a.minQuantity);
        return max !== null && minQ !== null && max < minQ
          ? { kind: 'maxBelowMin', message: 'Le maximum doit dépasser le seuil.' }
          : undefined;
      });
      required(a.deadline, { message: 'Indiquez une date de clôture.' });
      validate(a.deadline, ({ value }) =>
        value() && value() <= new Date().toISOString().slice(0, 10)
          ? { kind: 'past', message: 'La clôture doit être dans le futur.' }
          : undefined,
      );
    },
  );
});

const euros = (amount: number): Money => ({
  amountCents: Math.round(amount * 100),
  currency: 'EUR',
});

/** Convertit un brouillon valide en données d'annonce typées. */
export const toNewResource = (d: ListingDraft): NewResource => {
  const audience = [
    ...(d.audiencePro ? (['pro'] as const) : []),
    ...(d.audienceParticulier ? (['particulier'] as const) : []),
  ] as UserRole[];
  const base = {
    title: d.title.trim(),
    description: d.description.trim(),
    photoUrls: [],
    audience: audience as [UserRole, ...UserRole[]],
    address: {
      street: d.street.trim(),
      number: d.number.trim(),
      postalCode: d.postalCode,
      municipality: d.municipality.trim(),
      region: regionFromPostalCode(d.postalCode) ?? 'bruxelles',
      country: 'BE' as const,
    },
  };
  const pricing: Pricing =
    d.pricingMode === 'gratuit'
      ? { mode: 'gratuit' }
      : { mode: d.pricingMode, price: euros(d.priceEuros ?? 0) };
  const deposit = d.depositEuros ? euros(d.depositEuros) : undefined;

  switch (d.type) {
    case 'materiel':
      return {
        ...base,
        type: 'materiel',
        category: d.category.trim().toLowerCase(),
        condition: d.condition,
        pricing,
        deposit,
        weekendOnly: d.weekendOnly,
        unavailable: [],
      };
    case 'espace':
      return {
        ...base,
        type: 'espace',
        kind: d.espaceKind,
        surfaceM2: d.surfaceM2 ?? 0,
        access: d.access,
        pricing,
        deposit,
        unavailable: [],
      };
    case 'achat_groupe':
      return {
        ...base,
        type: 'achat_groupe',
        productName: d.productName.trim(),
        unit: d.unit.trim(),
        unitPrice: euros(d.unitPriceEuros ?? 0),
        minQuantity: d.minQuantity ?? 0,
        maxQuantity: d.maxQuantity ?? undefined,
        committedQuantity: 0,
        deadline: new Date(`${d.deadline}T23:59:00`).toISOString() as IsoDateTime,
      };
  }
};
