import {
  applyWhen,
  maxLength,
  minLength,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { Identity, Registration } from '../../core/auth/auth.service';
import { CompanySize, UserRole } from '../../shared/models';
import { BELGIAN_POSTAL_CODE, regionFromPostalCode } from '../../shared/utils/belgium';

/** Modèle plat du formulaire d'inscription (tous les champs existent, quel que soit le rôle). */
export interface RegistrationDraft {
  role: UserRole;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  legalName: string;
  vatNumber: string;
  companySize: CompanySize;
  street: string;
  number: string;
  postalCode: string;
  municipality: string;
}

export const emptyRegistration = (identity: Identity | null): RegistrationDraft => ({
  role: 'particulier',
  firstName: identity?.givenName ?? '',
  lastName: identity?.familyName ?? '',
  displayName: '',
  phone: '',
  legalName: '',
  vatNumber: '',
  companySize: 'tpe',
  street: '',
  number: '',
  postalCode: '',
  municipality: '',
});

/** Numéro d'entreprise belge (BCE), espaces et points tolérés : `BE 0123.456.789`. */
export const normalizeVat = (v: string): string => v.replace(/[\s.]/g, '').toUpperCase();
const BELGIAN_VAT = /^BE[01]\d{9}$/;
const BELGIAN_PHONE = /^\+32\d{8,9}$/;

export const registrationSchema = schema<RegistrationDraft>((p) => {
  required(p.street, { message: 'Indiquez la rue.' });
  required(p.number, { message: 'Indiquez le numéro.' });
  required(p.municipality, { message: 'Indiquez la commune.' });
  required(p.postalCode, { message: 'Indiquez le code postal.' });
  pattern(p.postalCode, BELGIAN_POSTAL_CODE, { message: 'Code postal belge à 4 chiffres.' });
  maxLength(p.postalCode, 4);
  pattern(p.phone, BELGIAN_PHONE, { message: 'Format +32 suivi de 8 ou 9 chiffres.' });

  applyWhen(
    p,
    ({ value }) => value().role === 'particulier',
    (r) => {
      required(r.firstName, { message: 'Indiquez votre prénom.' });
      required(r.lastName, { message: 'Indiquez votre nom.' });
    },
  );
  applyWhen(
    p,
    ({ value }) => value().role === 'pro',
    (r) => {
      required(r.legalName, { message: "Indiquez le nom de l'entreprise." });
      minLength(r.legalName, 2, { message: 'Au moins 2 caractères.' });
      required(r.vatNumber, { message: 'Indiquez le numéro d’entreprise.' });
      // Le format se vérifie après normalisation : espaces et points sont tolérés.
      validate(r.vatNumber, ({ value }) =>
        !value() || BELGIAN_VAT.test(normalizeVat(value()))
          ? undefined
          : { kind: 'vat', message: 'Numéro BCE : BE suivi de 10 chiffres, ex. BE0123456789.' },
      );
    },
  );
});

/** Convertit le brouillon en données d'inscription pour l'API. */
export const toRegistration = (d: RegistrationDraft): Registration => {
  const region = regionFromPostalCode(d.postalCode);
  if (!region) throw new Error('Code postal invalide.');
  const address = {
    street: d.street.trim(),
    number: d.number.trim(),
    postalCode: d.postalCode,
    municipality: d.municipality.trim(),
    region,
    country: 'BE' as const,
  };
  const phone = d.phone.trim() || undefined;
  if (d.role === 'pro') {
    return {
      role: 'pro',
      displayName: d.displayName.trim() || d.legalName.trim(),
      phone,
      address,
      company: {
        legalName: d.legalName.trim(),
        vatNumber: normalizeVat(d.vatNumber),
        size: d.companySize,
      },
    };
  }
  const firstName = d.firstName.trim();
  const lastName = d.lastName.trim();
  return {
    role: 'particulier',
    displayName: d.displayName.trim() || `${firstName} ${lastName.charAt(0)}.`,
    phone,
    address,
    firstName,
    lastName,
  };
};
