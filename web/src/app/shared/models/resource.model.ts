import {
  Address,
  DateRange,
  DistributiveOmit,
  GeoPoint,
  IsoDateTime,
  Money,
  ResourceId,
  Timestamped,
  UserId,
} from './common.model';
import { UserRole } from './user.model';

/** Les trois familles de ressources mutualisables. */
export type ResourceType = 'materiel' | 'espace' | 'achat_groupe';

export type ResourceStatus = 'brouillon' | 'publiee' | 'suspendue' | 'archivee';

/** Mode de tarification. `gratuit` correspond au prêt entre particuliers. */
export type Pricing =
  | { readonly mode: 'gratuit' }
  | {
      readonly mode: 'par_heure' | 'par_jour' | 'par_weekend' | 'par_mois';
      readonly price: Money;
    };

/** Champs communs à toutes les ressources. */
interface BaseResource extends Timestamped {
  readonly id: ResourceId;
  readonly ownerId: UserId;
  /** Écosystème du propriétaire. */
  readonly ownerRole: UserRole;
  /**
   * Écosystèmes autorisés à réserver. Permet l'interaction B2B ↔ B2C,
   * ex. un pro qui loue son matériel aux particuliers le week-end.
   */
  readonly audience: readonly [UserRole, ...UserRole[]];
  readonly title: string;
  readonly description: string;
  readonly photoUrls: readonly string[];
  readonly address: Address;
  readonly location: GeoPoint;
  readonly status: ResourceStatus;
}

export type MaterielCondition = 'neuf' | 'tres_bon' | 'bon' | 'use';

/** Outil ou matériel (pro ou particulier) à prêter ou louer. */
export interface MaterielResource extends BaseResource {
  readonly type: 'materiel';
  readonly category: string;
  readonly condition: MaterielCondition;
  readonly pricing: Pricing;
  /** Caution demandée, le cas échéant. */
  readonly deposit?: Money;
  /** Disponible uniquement le week-end (cas « matériel pro le week-end »). */
  readonly weekendOnly: boolean;
  /** Périodes déjà indisponibles (réservations confirmées, maintenance). */
  readonly unavailable: readonly DateRange[];
}

export type EspaceKind = 'stockage' | 'bureau' | 'atelier' | 'entrepot' | 'cave_garage';

/** Espace partagé : stockage, bureau, co-stockage entre particuliers. */
export interface EspaceResource extends BaseResource {
  readonly type: 'espace';
  readonly kind: EspaceKind;
  readonly surfaceM2: number;
  readonly access: 'libre' | 'sur_rendez_vous' | 'badge';
  readonly pricing: Pricing;
  readonly deposit?: Money;
  readonly unavailable: readonly DateRange[];
}

/** Achat groupé : ressource « à rejoindre » plutôt qu'à réserver sur une période. */
export interface AchatGroupeResource extends BaseResource {
  readonly type: 'achat_groupe';
  readonly productName: string;
  readonly unitPrice: Money;
  readonly unit: string;
  /** Seuil de déclenchement de la commande. */
  readonly minQuantity: number;
  readonly maxQuantity?: number;
  readonly committedQuantity: number;
  readonly deadline: IsoDateTime;
  readonly expectedDeliveryAt?: IsoDateTime;
}

/** Union discriminée sur `type`. */
export type Resource = MaterielResource | EspaceResource | AchatGroupeResource;

/** Extrait le sous-type de ressource correspondant à un `ResourceType`. */
export type ResourceOfType<T extends ResourceType> = Extract<Resource, { type: T }>;

export const isResourceOfType = <T extends ResourceType>(
  resource: Resource,
  type: T,
): resource is ResourceOfType<T> => resource.type === type;

/** Ressources réservables sur une période (par opposition aux achats groupés). */
export type RentableResource = MaterielResource | EspaceResource;

/**
 * Données saisies pour publier une annonce. Le serveur complète l'identifiant,
 * le propriétaire, le statut, la géolocalisation et les dates.
 */
export type NewResource = DistributiveOmit<
  Resource,
  'id' | 'ownerId' | 'ownerRole' | 'status' | 'location' | 'createdAt' | 'updatedAt'
>;
