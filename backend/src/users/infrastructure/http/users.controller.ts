import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { bearerToken } from '../../../shared/infrastructure/http/bearer-token';
import { CreateUserDto } from './dtos/create-user.dto';

/** Driving adapter: translates HTTP calls into use-case invocations. */
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Get()
  getAllUsers() {
    return this.listUsers.execute();
  }

  @Get('me')
  getMe(@Req() request: Request) {
    return this.getCurrentUser.execute(bearerToken(request));
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.createUser.execute({ name: dto.name, token: dto.token });
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.deleteUser.execute(name);
  }
}
