import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, ResourceNotFoundError } from '../../../shared/domain/domain-error';
import { RunningServer } from '../../domain/entities/running-server';
import { LOG_BUFFER, LOG_SOURCES, LogBuffer, LogSource } from '../../domain/ports/log-source.port';
import { PORT_CHECKER, PortChecker } from '../../domain/ports/port-checker.port';
import { PROCESS_RUNNER, ProcessRunner } from '../../domain/ports/process-runner.port';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';
import {
  SERVER_CONFIG_REPOSITORY,
  ServerConfigRepository,
} from '../../domain/ports/server-config.repository';

@Injectable()
export class StartServerUseCase {
  constructor(
    @Inject(SERVER_CONFIG_REPOSITORY)
    private readonly servers: ServerConfigRepository,
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
    @Inject(PROCESS_RUNNER) private readonly processRunner: ProcessRunner,
    @Inject(PORT_CHECKER) private readonly portChecker: PortChecker,
    @Inject(LOG_BUFFER) private readonly logBuffer: LogBuffer,
    @Inject(LOG_SOURCES) private readonly logSources: LogSource[],
  ) {}

  async execute(name: string, port: number): Promise<RunningServer> {
    const config = this.servers.findByName(name);

    if (!config) {
      throw new ResourceNotFoundError('Server configuration not found');
    }

    if (this.running.findByName(name)) {
      throw new ConflictError('Server is already running');
    }

    if (await this.portChecker.isInUse(port)) {
      throw new ConflictError(`Port ${port} is already in use`);
    }

    const workingDir = this.processRunner.resolveWorkingDir(config.exePath);
    const logOffsets = this.snapshotLogOffsets(workingDir);

    this.logBuffer.open(name);

    let launched;
    try {
      launched = this.processRunner.launch({ exePath: config.exePath, workingDir, port });
    } catch (error) {
      this.logBuffer.close(name);
      throw error;
    }

    launched.onOutput((line) => this.logBuffer.append(name, line));
    launched.onExit((code) => this.handleExit(name, launched.pid, code));

    const runningServer: RunningServer = {
      name,
      port,
      pid: launched.pid,
      workingDir,
      startedAt: Date.now(),
      logOffsets,
    };

    this.running.save(runningServer);
    return runningServer;
  }

  private snapshotLogOffsets(workingDir: string): Record<string, number> {
    return this.logSources.reduce<Record<string, number>>(
      (offsets, source) => ({ ...offsets, ...(source.snapshot?.(workingDir) ?? {}) }),
      {},
    );
  }

  private handleExit(name: string, pid: number | undefined, code: number | null) {
    if (code !== 0 && code !== null) {
      this.logBuffer.append(name, `[ERROR] Process exited with code ${code}`);
    }

    // Only clear the registry if it still points at the process that just died.
    if (this.running.findByName(name)?.pid === pid) {
      this.running.remove(name);
      this.logBuffer.close(name);
    }
  }
}
