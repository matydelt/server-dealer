import { User } from '../entities/user';

export const USER_REPOSITORY = Symbol('UserRepository');

/** Driven port: persistence of users and the single admin token. */
export interface UserRepository {
  findAll(): User[];
  findByName(name: string): User | null;
  findByToken(token: string): User | null;
  add(user: User): void;
  remove(name: string): boolean;
  getAdminToken(): string;
}
