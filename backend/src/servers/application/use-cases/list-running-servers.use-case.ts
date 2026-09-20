import { Inject, Injectable } from '@nestjs/common';
import { RunningServer } from '../../domain/entities/running-server';
import {
  RUNNING_SERVER_REPOSITORY,
  RunningServerRepository,
} from '../../domain/ports/running-server.repository';

@Injectable()
export class ListRunningServersUseCase {
  constructor(
    @Inject(RUNNING_SERVER_REPOSITORY)
    private readonly running: RunningServerRepository,
  ) {}

  execute(): RunningServer[] {
    return this.running.findAll();
  }
}
