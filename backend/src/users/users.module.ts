import { Module } from '@nestjs/common';
import { AuthenticateTokenUseCase } from './application/use-cases/authenticate-token.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { UsersController } from './infrastructure/http/users.controller';
import { JsonUserRepository } from './infrastructure/persistence/json-user.repository';

/** Composition root for the users hexagon. */
@Module({
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetCurrentUserUseCase,
    CreateUserUseCase,
    DeleteUserUseCase,
    AuthenticateTokenUseCase,
    { provide: USER_REPOSITORY, useClass: JsonUserRepository },
  ],
  exports: [AuthenticateTokenUseCase],
})
export class UsersModule {}
