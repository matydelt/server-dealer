import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';
import {
  SERVER_CONFIG_REPOSITORY,
  ServerConfigRepository,
} from '../../domain/ports/server-config.repository';

@Injectable()
export class DeleteServerUseCase {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly servers: ServerConfigRepository,
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
  ) {}

  execute(name: string): void {
    if (!this.servers.remove(name)) {
      throw new ResourceNotFoundError('Server not found');
    }

    this.running.remove(name);
  }
}
