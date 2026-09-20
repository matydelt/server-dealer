import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { LOG_BUFFER, LogBuffer } from '../../domain/ports/log-source.port';
import { PROCESS_RUNNER, ProcessRunner } from '../../domain/ports/process-runner.port';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';

@Injectable()
export class StopServerUseCase {
  constructor(
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
    @Inject(PROCESS_RUNNER) private readonly processRunner: ProcessRunner,
    @Inject(LOG_BUFFER) private readonly logBuffer: LogBuffer,
  ) {}

  execute(name: string): void {
    const server = this.running.findByName(name);

    if (!server) {
      throw new ResourceNotFoundError('Server is not running');
    }

    if (server.pid) {
      this.processRunner.kill(server.pid);
    }

    // The registry is cleared even if the kill failed: the process is gone or unreachable.
    this.running.remove(name);
    this.logBuffer.close(name);
  }
}
