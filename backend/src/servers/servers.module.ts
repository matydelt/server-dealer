import { Module } from '@nestjs/common';
import { CreateServerUseCase } from './application/use-cases/create-server.use-case';
import { DeleteServerUseCase } from './application/use-cases/delete-server.use-case';
import { GetServerLogsUseCase } from './application/use-cases/get-server-logs.use-case';
import { GetServerStatusUseCase } from './application/use-cases/get-server-status.use-case';
import { ListRunningServersUseCase } from './application/use-cases/list-running-servers.use-case';
import { ListServersUseCase } from './application/use-cases/list-servers.use-case';
import { RestartServerUseCase } from './application/use-cases/restart-server.use-case';
import { StartServerUseCase } from './application/use-cases/start-server.use-case';
import { StopServerUseCase } from './application/use-cases/stop-server.use-case';
import { UpdateServerUseCase } from './application/use-cases/update-server.use-case';
import { LOG_BUFFER, LOG_SOURCES } from './domain/ports/log-source.port';
import { PORT_CHECKER } from './domain/ports/port-checker.port';
import { PROCESS_RUNNER } from './domain/ports/process-runner.port';
import { RUNNING_SERVER_REPOSITORY } from './domain/ports/running-server.repository';
import { SERVER_CONFIG_REPOSITORY } from './domain/ports/server-config.repository';
import { ServersController } from './infrastructure/http/servers.controller';
import { HttpLogSource } from './infrastructure/logs/http-log-source';
import { InMemoryLogBuffer } from './infrastructure/logs/in-memory-log-buffer';
import { UnityFileLogSource } from './infrastructure/logs/unity-file-log-source';
import { JsonRunningServerRepository } from './infrastructure/persistence/json-running-server.repository';
import { JsonServerConfigRepository } from './infrastructure/persistence/json-server-config.repository';
import { TcpPortChecker } from './infrastructure/process/tcp-port-checker';
import { WindowsProcessRunner } from './infrastructure/process/windows-process-runner';

const USE_CASES = [
  ListServersUseCase,
  ListRunningServersUseCase,
  GetServerStatusUseCase,
  GetServerLogsUseCase,
  CreateServerUseCase,
  UpdateServerUseCase,
  DeleteServerUseCase,
  StartServerUseCase,
  StopServerUseCase,
  RestartServerUseCase,
];

/** Composition root for the servers hexagon: ports on the left, adapters on the right. */
@Module({
  controllers: [ServersController],
  providers: [
    ...USE_CASES,
    HttpLogSource,
    UnityFileLogSource,
    { provide: SERVER_CONFIG_REPOSITORY, useClass: JsonServerConfigRepository },
    { provide: RUNNING_SERVER_REPOSITORY, useClass: JsonRunningServerRepository },
    { provide: PROCESS_RUNNER, useClass: WindowsProcessRunner },
    { provide: PORT_CHECKER, useClass: TcpPortChecker },
    { provide: LOG_BUFFER, useClass: InMemoryLogBuffer },
    {
      // Order matters: the first source that answers wins.
      provide: LOG_SOURCES,
      useFactory: (http: HttpLogSource, unity: UnityFileLogSource) => [http, unity],
      inject: [HttpLogSource, UnityFileLogSource],
    },
  ],
})
export class ServersModule {}
