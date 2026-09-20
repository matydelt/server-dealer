import { RunningServer } from '../entities/running-server';

export const RUNNING_SERVER_REPOSITORY = Symbol('RunningServerRepository');

/** Driven port: registry of the servers currently running. */
export interface RunningServerRepository {
  findAll(): RunningServer[];
  findByName(name: string): RunningServer | null;
  save(server: RunningServer): void;
  remove(name: string): void;
}
