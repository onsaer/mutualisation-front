import { Address, IsoDateTime, Timestamped, UserId } from './common.model.js';

/** Les deux écosystèmes de l'application. */
export type UserRole = 'pro' | 'particulier';

/** Catégorie d'entreprise côté B2B. */
export type CompanySize = 'tpe' | 'pme' | 'commercant';

/** Numéro de TVA / BCE belge, ex. `BE0123456789`. */
export type BelgianVatNumber = `BE${string}`;

export interface Company {
  readonly legalName: string;
  readonly vatNumber: BelgianVatNumber;
  readonly size: CompanySize;
  /** Code NACE-BEL du secteur d'activité, optionnel. */
  readonly naceCode?: string;
}

/** Champs partagés par tous les utilisateurs. */
interface BaseUser extends Timestamped {
  readonly id: UserId;
  readonly email: string;
  readonly phone?: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly address: Address;
  /** Identité vérifiée (itsme, eID…), requise pour louer du matériel de valeur. */
  readonly verifiedAt: IsoDateTime | null;
  readonly preferredLanguage: 'fr' | 'nl' | 'de' | 'en';
}

/** Utilisateur B2B : agit pour le compte d'une entreprise. */
export interface ProUser extends BaseUser {
  readonly role: 'pro';
  readonly company: Company;
}

/** Utilisateur B2C. */
export interface ParticulierUser extends BaseUser {
  readonly role: 'particulier';
  readonly firstName: string;
  readonly lastName: string;
  /** Quartier de rattachement pour les achats groupés de quartier. */
  readonly neighbourhoodId?: string;
}

/** Union discriminée sur `role` : TypeScript affine le type après un test `user.role === 'pro'`. */
export type User = ProUser | ParticulierUser;

export const isProUser = (user: User): user is ProUser => user.role === 'pro';
export const isParticulierUser = (user: User): user is ParticulierUser =>
  user.role === 'particulier';
