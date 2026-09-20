import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('me')
  getCurrentUser(@Req() req) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    return this.usersService.getCurrentUser(token);
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Delete(':name')
  deleteUser(@Param('name') name: string) {
    return this.usersService.deleteUser(name);
  }
}
