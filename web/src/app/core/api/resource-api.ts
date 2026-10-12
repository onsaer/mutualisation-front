import {
  NewResource,
  Resource,
  ResourceId,
  ResourceOfType,
  ResourceType,
  User,
  UserId,
  UserRole,
} from '../../shared/models';

/** Critères de recherche de ressources. */
export interface ResourceQuery<T extends ResourceType = ResourceType> {
  readonly type: T;
  /** Écosystème qui consulte : ne renvoie que les ressources qui lui sont ouvertes. */
  readonly audience?: UserRole;
  readonly ownerId?: UserId;
  /** Écosystème du propriétaire, ex. `pro` pour le matériel pro loué aux particuliers. */
  readonly ownerRole?: UserRole;
}

/**
 * Contrat d'accès aux ressources. Les composants dépendent de cette abstraction,
 * l'implémentation (fictive aujourd'hui, HTTP demain) est choisie dans `app.config.ts`.
 */
export abstract class ResourceApi {
  abstract list<T extends ResourceType>(
    query: ResourceQuery<T>,
  ): Promise<readonly ResourceOfType<T>[]>;

  abstract get(id: ResourceId): Promise<ResourceOfType<ResourceType> | null>;

  /** Publie une nouvelle annonce au nom de `owner`. */
  abstract create(input: NewResource, owner: User): Promise<Resource>;
}
