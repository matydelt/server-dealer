import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { LOG_BUFFER, LOG_SOURCES, LogBuffer, LogSource } from '../../domain/ports/log-source.port';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';

@Injectable()
export class GetServerLogsUseCase {
  constructor(
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
    @Inject(LOG_SOURCES) private readonly logSources: LogSource[],
    @Inject(LOG_BUFFER) private readonly logBuffer: LogBuffer,
  ) {}

  async execute(name: string): Promise<string[]> {
    const server = this.running.findByName(name);

    if (!server) {
      throw new ResourceNotFoundError('Server not found or not running');
    }

    // Sources are ordered from most to least authoritative; first hit wins.
    for (const source of this.logSources) {
      const lines = await source.read(server);
      if (lines !== null) {
        return lines;
      }
    }

    return this.logBuffer.read(name);
  }
}
