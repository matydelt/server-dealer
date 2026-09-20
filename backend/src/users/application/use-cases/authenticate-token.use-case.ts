import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../domain/entities/user';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';

/**
 * Resolves a bearer token into an identity. Returns null when the token is
 * unknown; callers decide how to react (HTTP 403, and so on).
 */
@Injectable()
export class AuthenticateTokenUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(token: string | undefined): AuthenticatedUser | null {
    if (!token) {
      return null;
    }

    if (token === this.users.getAdminToken()) {
      return { name: 'admin', isAdmin: true };
    }

    const user = this.users.findByToken(token);
    return user ? { name: user.name, isAdmin: false } : null;
  }
}
