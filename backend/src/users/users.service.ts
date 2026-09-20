import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface User {
  name: string;
  token: string;
}

export interface UsersData {
  adminToken: string;
  users: User[];
}

@Injectable()
export class UsersService {
  private usersPath = path.join(process.cwd(), 'data', 'users.json');

  constructor() {
    this.ensureDataFileExists();
  }

  private ensureDataFileExists() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.usersPath)) {
      const initialData: UsersData = {
        adminToken: 'admin-secret-token-123',
        users: [],
      };
      fs.writeFileSync(this.usersPath, JSON.stringify(initialData, null, 2));
    }
  }

  private readUsersData(): UsersData {
    try {
      const data = fs.readFileSync(this.usersPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return { adminToken: 'admin-secret-token-123', users: [] };
    }
  }

  private writeUsersData(data: UsersData) {
    fs.writeFileSync(this.usersPath, JSON.stringify(data, null, 2));
  }

  getAllUsers(): User[] {
    const data = this.readUsersData();
    return data.users;
  }

  getCurrentUser(token: string): { name: string; isAdmin: boolean } {
    const data = this.readUsersData();
    
    if (token === data.adminToken) {
      return { name: 'admin', isAdmin: true };
    }

    const user = data.users.find(u => u.token === token);
    if (user) {
      return { name: user.name, isAdmin: false };
    }

    throw new NotFoundException('User not found');
  }

  createUser(createUserDto: CreateUserDto): User {
    const data = this.readUsersData();
    
    if (data.users.find(u => u.name === createUserDto.name)) {
      throw new Error('User with this name already exists');
    }

    if (data.users.find(u => u.token === createUserDto.token)) {
      throw new Error('Token already in use');
    }

    const newUser: User = {
      name: createUserDto.name,
      token: createUserDto.token,
    };

    data.users.push(newUser);
    this.writeUsersData(data);
    return newUser;
  }

  deleteUser(name: string): void {
    const data = this.readUsersData();
    const filteredUsers = data.users.filter(u => u.name !== name);
    
    if (data.users.length === filteredUsers.length) {
      throw new NotFoundException('User not found');
    }

    data.users = filteredUsers;
    this.writeUsersData(data);
  }

  getAdminToken(): string {
    const data = this.readUsersData();
    return data.adminToken;
  }
}
