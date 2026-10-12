import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.js';
import type { User } from '../domain/index.js';

@Controller('me')
export class MeController {
  /** Profil de l'utilisateur connecté. */
  @Get()
  me(@CurrentUser() user: User): User {
    return user;
  }
}
