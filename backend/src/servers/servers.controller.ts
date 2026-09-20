import { Controller, Get, Post, Delete, Put, Body, Param } from '@nestjs/common';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dtos/create-server.dto';
import { StartServerDto } from './dtos/start-server.dto';

@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  getAllServers() {
    return this.serversService.getAllServers();
  }

  @Get('running')
  getRunningServers() {
    return this.serversService.getRunningServers();
  }

  @Get(':name/status')
  getServerStatus(@Param('name') name: string) {
    return this.serversService.getServerStatus(name);
  }

  @Get(':name/logs')
  getServerLogs(@Param('name') name: string) {
    return this.serversService.getServerLogs(name);
  }

  @Post()
  createServer(@Body() createServerDto: CreateServerDto) {
    return this.serversService.createServer(createServerDto);
  }

  @Put(':name')
  updateServer(@Param('name') name: string, @Body() updateData: { exePath?: string }) {
    return this.serversService.updateServer(name, updateData);
  }

  @Post('start')
  startServer(@Body() startServerDto: StartServerDto) {
    return this.serversService.startServer(startServerDto);
  }

  @Post('stop/:name')
  stopServer(@Param('name') name: string) {
    return this.serversService.stopServer(name);
  }

  @Post('restart/:name')
  restartServer(@Param('name') name: string) {
    return this.serversService.restartServer(name);
  }

  @Delete(':name')
  deleteServer(@Param('name') name: string) {
    return this.serversService.deleteServer(name);
  }
}
