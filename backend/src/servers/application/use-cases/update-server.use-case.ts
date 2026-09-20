import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { ServerConfig } from '../../domain/entities/server-config';
import {
  SERVER_CONFIG_REPOSITORY,
  ServerConfigRepository,
} from '../../domain/ports/server-config.repository';

@Injectable()
export class UpdateServerUseCase {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly servers: ServerConfigRepository,
  ) {}

  execute(name: string, changes: { exePath?: string }): ServerConfig {
    const server = this.servers.findByName(name);

    if (!server) {
      throw new ResourceNotFoundError('Server not found');
    }

    const updated: ServerConfig = {
      ...server,
      exePath: changes.exePath ?? server.exePath,
    };

    this.servers.update(updated);
    return updated;
  }
}
