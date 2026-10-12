import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Identity } from '../auth/auth.js';
import type { RegistrationInput } from '../common/schemas.js';
import { DB, type Database } from '../db/database.js';
import { toUser } from '../db/mappers.js';
import { users } from '../db/schema.js';
import type { User } from '../domain/index.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Crée le profil lié à l'identité OpenID Connect. L'e-mail vient du fournisseur d'identité
   * (il n'est pas saisi), et le profil est marqué vérifié si la connexion vient d'itsme.
   */
  async register(identity: Identity, input: RegistrationInput): Promise<User> {
    if (!identity.email) {
      throw new ConflictException(
        'Votre compte de connexion ne fournit pas d’adresse e-mail.',
      );
    }
    const [taken] = await this.db
      .select({ authSubject: users.authSubject })
      .from(users)
      .where(
        or(
          eq(users.authSubject, identity.subject),
          eq(users.email, identity.email),
        ),
      )
      .limit(1);
    if (taken) {
      throw new ConflictException(
        taken.authSubject === identity.subject
          ? 'Votre profil existe déjà.'
          : 'Cette adresse e-mail est déjà liée à un autre compte.',
      );
    }

    const now = new Date();
    const [row] = await this.db
      .insert(users)
      .values({
        id: `u-${randomUUID()}`,
        authSubject: identity.subject,
        role: input.role,
        email: identity.email,
        phone: input.phone ?? null,
        displayName: input.displayName,
        address: input.address,
        verifiedAt: identity.verified ? now : null,
        preferredLanguage: input.preferredLanguage,
        company:
          input.role === 'pro'
            ? {
                ...input.company,
                vatNumber: input.company.vatNumber as `BE${string}`,
              }
            : null,
        firstName: input.role === 'particulier' ? input.firstName : null,
        lastName: input.role === 'particulier' ? input.lastName : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return toUser(row!);
  }
}
