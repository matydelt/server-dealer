import { ServerConfig } from '../entities/server-config';

export const SERVER_CONFIG_REPOSITORY = Symbol('ServerConfigRepository');

/** Driven port: persistence of server configurations. */
export interface ServerConfigRepository {
  findAll(): ServerConfig[];
  findByName(name: string): ServerConfig | null;
  add(server: ServerConfig): void;
  update(server: ServerConfig): void;
  remove(name: string): boolean;
}
