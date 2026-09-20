import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(name: string): void {
    if (!this.users.remove(name)) {
      throw new ResourceNotFoundError('User not found');
    }
  }
}
