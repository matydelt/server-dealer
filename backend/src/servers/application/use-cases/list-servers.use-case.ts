import { Inject, Injectable } from '@nestjs/common';
import { ServerConfig } from '../../domain/entities/server-config';
import {
  SERVER_CONFIG_REPOSITORY,
  ServerConfigRepository,
} from '../../domain/ports/server-config.repository';

@Injectable()
export class ListServersUseCase {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly servers: ServerConfigRepository,
  ) {}

  execute(): ServerConfig[] {
    return this.servers.findAll();
  }
}
