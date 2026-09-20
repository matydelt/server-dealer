import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { AuthenticatedUser } from '../../domain/entities/user';
import { AuthenticateTokenUseCase } from './authenticate-token.use-case';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly authenticateToken: AuthenticateTokenUseCase) {}

  execute(token: string | undefined): AuthenticatedUser {
    const user = this.authenticateToken.execute(token);

    if (!user) {
      throw new ResourceNotFoundError('User not found');
    }

    return user;
  }
}
