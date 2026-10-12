import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DB, type Database } from '../db/database.js';
import { toUser } from '../db/mappers.js';
import { users } from '../db/schema.js';
import type { User } from '../domain/index.js';

const IS_PUBLIC = 'isPublic';

/** Route accessible sans connexion. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Utilisateur connecté, injecté dans un paramètre de contrôleur. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

interface AuthedRequest extends Request {
  user: User;
}

/**
 * Authentification de DÉMONSTRATION : `Authorization: Bearer <identifiant utilisateur>`.
 * À remplacer avant toute mise en production (OpenID Connect avec itsme ou un fournisseur
 * comme Keycloak / Auth0 : vérification d'un JWT signé, l'identifiant venant du jeton).
 */
@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const userId = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    if (!userId) throw new UnauthorizedException('Connexion requise.');
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) throw new UnauthorizedException('Session invalide.');
    req.user = toUser(row);
    return true;
  }
}
