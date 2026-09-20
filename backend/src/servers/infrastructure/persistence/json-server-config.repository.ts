import { Injectable } from '@nestjs/common';
import { JsonFileStore } from '../../../shared/infrastructure/persistence/json-file.store';
import { ServerConfig } from '../../domain/entities/server-config';
import { ServerConfigRepository } from '../../domain/ports/server-config.repository';

@Injectable()
export class JsonServerConfigRepository implements ServerConfigRepository {
  private readonly store = new JsonFileStore<ServerConfig[]>('servers.json', () => []);

  findAll(): ServerConfig[] {
    return this.store.read();
  }

  findByName(name: string): ServerConfig | null {
    return this.findAll().find((server) => server.name === name) ?? null;
  }

  add(server: ServerConfig): void {
    const servers = this.findAll();
    servers.push(server);
    this.store.write(servers);
  }

  update(server: ServerConfig): void {
    const servers = this.findAll().map((existing) =>
      existing.name === server.name ? server : existing,
    );
    this.store.write(servers);
  }

  remove(name: string): boolean {
    const servers = this.findAll();
    const remaining = servers.filter((server) => server.name !== name);

    if (remaining.length === servers.length) {
      return false;
    }

    this.store.write(remaining);
    return true;
  }
}
