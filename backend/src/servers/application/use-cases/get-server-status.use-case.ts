import { Inject, Injectable } from '@nestjs/common';
import { ServerStatus } from '../../domain/entities/running-server';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';

@Injectable()
export class GetServerStatusUseCase {
  constructor(
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
  ) {}

  execute(name: string): ServerStatus {
    const server = this.running.findByName(name);

    if (!server) {
      return { running: false };
    }

    return { running: true, port: server.port, pid: server.pid };
  }
}
