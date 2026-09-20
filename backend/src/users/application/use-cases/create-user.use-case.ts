import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../shared/domain/domain-error';
import { User } from '../../domain/entities/user';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(user: User): User {
    if (this.users.findByName(user.name)) {
      throw new ConflictError('User with this name already exists');
    }

    if (this.users.findByToken(user.token)) {
      throw new ConflictError('Token already in use');
    }

    this.users.add(user);
    return user;
  }
}
