import { Injectable } from '@nestjs/common';
import { JsonFileStore } from '../../../shared/infrastructure/persistence/json-file.store';
import { User } from '../../domain/entities/user';
import { UserRepository } from '../../domain/ports/user.repository';

const DEFAULT_ADMIN_TOKEN = 'admin-secret-token-123';

interface UsersDocument {
  adminToken: string;
  users: User[];
}

@Injectable()
export class JsonUserRepository implements UserRepository {
  private readonly store = new JsonFileStore<UsersDocument>('users.json', () => ({
    adminToken: DEFAULT_ADMIN_TOKEN,
    users: [],
  }));

  findAll(): User[] {
    return this.store.read().users;
  }

  findByName(name: string): User | null {
    return this.findAll().find((user) => user.name === name) ?? null;
  }

  findByToken(token: string): User | null {
    return this.findAll().find((user) => user.token === token) ?? null;
  }

  add(user: User): void {
    const document = this.store.read();
    document.users.push(user);
    this.store.write(document);
  }

  remove(name: string): boolean {
    const document = this.store.read();
    const remaining = document.users.filter((user) => user.name !== name);

    if (remaining.length === document.users.length) {
      return false;
    }

    document.users = remaining;
    this.store.write(document);
    return true;
  }

  getAdminToken(): string {
    return this.store.read().adminToken;
  }
}
