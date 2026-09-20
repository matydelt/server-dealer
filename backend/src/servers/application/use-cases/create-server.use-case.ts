import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../shared/domain/domain-error';
import { ServerConfig } from '../../domain/entities/server-config';
import {
  SERVER_CONFIG_REPOSITORY,
  ServerConfigRepository,
} from '../../domain/ports/server-config.repository';

@Injectable()
export class CreateServerUseCase {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly servers: ServerConfigRepository,
  ) {}

  execute(server: ServerConfig): ServerConfig {
    if (this.servers.findByName(server.name)) {
      throw new ConflictError('Server with this name already exists');
    }

    this.servers.add(server);
    return server;
  }
}
