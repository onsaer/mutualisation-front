import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { DB, type Database } from '../db/database.js';
import { toUser } from '../db/mappers.js';
import { users } from '../db/schema.js';
import type { User } from '../domain/index.js';
import { AUTH_CONFIG, type AuthConfig } from './auth.config.js';

const IS_PUBLIC = 'isPublic';
const ALLOW_UNREGISTERED = 'allowUnregistered';

/** Route accessible sans connexion. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route accessible à une personne connectée qui n'a pas encore créé son profil (inscription). */
export const AllowUnregistered = () => SetMetadata(ALLOW_UNREGISTERED, true);

/** Identité prouvée par le fournisseur d'identité (jeton OpenID Connect). */
export interface Identity {
  readonly subject: string;
  readonly email?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  /** Vrai si l'identité vient d'itsme (identité vérifiée par la banque de la personne). */
  readonly verified: boolean;
}

interface AuthedRequest extends Request {
  user?: User;
  identity?: Identity;
}

/** Utilisateur connecté (profil complet). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);

/** Identité OpenID Connect de la requête (disponible aussi avant l'inscription). */
export const CurrentIdentity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Identity | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().identity,
);

/** Code d'erreur que le front utilise pour rediriger vers l'inscription. */
export const PROFILE_REQUIRED = 'PROFILE_REQUIRED';

/**
 * Garde globale. En mode `oidc`, vérifie la signature, l'émetteur, l'audience et l'expiration
 * du jeton, puis retrouve le profil par le `sub`. En mode `demo`, le jeton est l'identifiant.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {
    if (config.mode === 'oidc')
      this.jwks = createRemoteJWKSet(new URL(config.jwksUrl!));
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const flag = (key: string) =>
      this.reflector.getAllAndOverride<boolean>(key, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    if (flag(IS_PUBLIC)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    if (!token) throw new UnauthorizedException('Connexion requise.');

    if (this.config.mode === 'demo') {
      req.user = await this.findUser(users.id, token);
      if (!req.user) throw new UnauthorizedException('Session invalide.');
      return true;
    }

    req.identity = await this.verify(token);
    req.user = await this.findUser(users.authSubject, req.identity.subject);
    if (!req.user && !flag(ALLOW_UNREGISTERED)) {
      throw new ForbiddenException({
        message: 'Profil à compléter.',
        code: PROFILE_REQUIRED,
      });
    }
    return true;
  }

  private async verify(token: string): Promise<Identity> {
    let payload: JWTPayload & Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(token, this.jwks!, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }));
    } catch {
      throw new UnauthorizedException('Session expirée. Reconnectez-vous.');
    }
    if (!payload.sub) throw new UnauthorizedException('Jeton invalide.');
    const str = (k: string) =>
      typeof payload[k] === 'string' ? (payload[k] as string) : undefined;
    return {
      subject: payload.sub,
      email: str('email'),
      givenName: str('given_name'),
      familyName: str('family_name'),
      verified:
        str('identity_provider') === this.config.verifiedIdentityProvider,
    };
  }

  private async findUser(
    column: typeof users.id | typeof users.authSubject,
    value: string,
  ) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(column, value))
      .limit(1);
    return row && toUser(row);
  }
}
