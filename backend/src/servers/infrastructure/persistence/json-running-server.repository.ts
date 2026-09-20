import { Injectable } from '@nestjs/common';
import { JsonFileStore } from '../../../shared/infrastructure/persistence/json-file.store';
import { RunningServer } from '../../domain/entities/running-server';
import { RunningServerRepository } from '../../domain/ports/running-server.repository';

type RunningServerRecord = Record<string, RunningServer>;

@Injectable()
export class JsonRunningServerRepository implements RunningServerRepository {
  private readonly store = new JsonFileStore<RunningServerRecord>(
    'running-servers.json',
    () => ({}),
  );

  findAll(): RunningServer[] {
    return Object.values(this.store.read());
  }

  findByName(name: string): RunningServer | null {
    return this.store.read()[name] ?? null;
  }

  save(server: RunningServer): void {
    const servers = this.store.read();
    servers[server.name] = server;
    this.store.write(servers);
  }

  remove(name: string): void {
    const servers = this.store.read();
    delete servers[name];
    this.store.write(servers);
  }
}
