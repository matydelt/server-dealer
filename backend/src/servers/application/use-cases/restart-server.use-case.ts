import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { RunningServer } from '../../domain/entities/running-server';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';
import { StartServerUseCase } from './start-server.use-case';
import { StopServerUseCase } from './stop-server.use-case';

const RESTART_DELAY_MS = 1000;

@Injectable()
export class RestartServerUseCase {
  constructor(
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
    private readonly stopServer: StopServerUseCase,
    private readonly startServer: StartServerUseCase,
  ) {}

  async execute(name: string): Promise<RunningServer> {
    const server = this.running.findByName(name);

    if (!server) {
      throw new ResourceNotFoundError('Server is not running');
    }

    const port = server.port;
    this.stopServer.execute(name);

    // Give the OS a moment to release the port before binding it again.
    await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));

    return this.startServer.execute(name, port);
  }
}
