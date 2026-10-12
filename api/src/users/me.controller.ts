import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import {
  AllowUnregistered,
  CurrentIdentity,
  CurrentUser,
  type Identity,
} from '../auth/auth.js';
import {
  registrationSchema,
  type RegistrationInput,
} from '../common/schemas.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { User } from '../domain/index.js';
import { UsersService } from './users.service.js';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  /** Profil de l'utilisateur connecté. 403 `PROFILE_REQUIRED` s'il reste à créer. */
  @Get()
  me(@CurrentUser() user: User): User {
    return user;
  }

  /** Inscription : crée le profil après la première connexion OpenID Connect. */
  @Post()
  @AllowUnregistered()
  register(
    @CurrentIdentity() identity: Identity | undefined,
    @Body(new ZodPipe(registrationSchema)) body: RegistrationInput,
  ): Promise<User> {
    // En mode démo, il n'y a pas d'identité : les comptes de démonstration existent déjà.
    if (!identity)
      throw new NotFoundException('Inscription indisponible en mode démo.');
    return this.users.register(identity, body);
  }
}
