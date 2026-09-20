import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateServerUseCase } from '../../application/use-cases/create-server.use-case';
import { DeleteServerUseCase } from '../../application/use-cases/delete-server.use-case';
import { GetServerLogsUseCase } from '../../application/use-cases/get-server-logs.use-case';
import { GetServerStatusUseCase } from '../../application/use-cases/get-server-status.use-case';
import { ListRunningServersUseCase } from '../../application/use-cases/list-running-servers.use-case';
import { ListServersUseCase } from '../../application/use-cases/list-servers.use-case';
import { RestartServerUseCase } from '../../application/use-cases/restart-server.use-case';
import { StartServerUseCase } from '../../application/use-cases/start-server.use-case';
import { StopServerUseCase } from '../../application/use-cases/stop-server.use-case';
import { UpdateServerUseCase } from '../../application/use-cases/update-server.use-case';
import { CreateServerDto } from './dtos/create-server.dto';
import { StartServerDto } from './dtos/start-server.dto';
import { UpdateServerDto } from './dtos/update-server.dto';

/** Driving adapter: translates HTTP calls into use-case invocations. */
@Controller('servers')
export class ServersController {
  constructor(
    private readonly listServers: ListServersUseCase,
    private readonly listRunningServers: ListRunningServersUseCase,
    private readonly getServerStatus: GetServerStatusUseCase,
    private readonly getServerLogs: GetServerLogsUseCase,
    private readonly createServer: CreateServerUseCase,
    private readonly updateServer: UpdateServerUseCase,
    private readonly startServer: StartServerUseCase,
    private readonly stopServer: StopServerUseCase,
    private readonly restartServer: RestartServerUseCase,
    private readonly deleteServer: DeleteServerUseCase,
  ) {}

  @Get()
  getAllServers() {
    return this.listServers.execute();
  }

  @Get('running')
  getRunningServers() {
    return this.listRunningServers.execute();
  }

  @Get(':name/status')
  getStatus(@Param('name') name: string) {
    return this.getServerStatus.execute(name);
  }

  @Get(':name/logs')
  getLogs(@Param('name') name: string) {
    return this.getServerLogs.execute(name);
  }

  @Post()
  create(@Body() dto: CreateServerDto) {
    return this.createServer.execute({ name: dto.name, exePath: dto.exePath });
  }

  @Put(':name')
  update(@Param('name') name: string, @Body() dto: UpdateServerDto) {
    return this.updateServer.execute(name, dto);
  }

  @Post('start')
  start(@Body() dto: StartServerDto) {
    return this.startServer.execute(dto.name, dto.port);
  }

  @Post('stop/:name')
  stop(@Param('name') name: string) {
    return this.stopServer.execute(name);
  }

  @Post('restart/:name')
  restart(@Param('name') name: string) {
    return this.restartServer.execute(name);
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.deleteServer.execute(name);
  }
}
