import { RunningServer } from '../entities/running-server';

export const LOG_SOURCES = Symbol('LogSources');
export const LOG_BUFFER = Symbol('LogBuffer');

/**
 * Driven port: one place logs may come from (an HTTP endpoint on the server,
 * a log file on disk, ...). Sources are tried in order and the first one that
 * returns lines wins.
 */
export interface LogSource {
  readonly name: string;
  read(server: RunningServer): Promise<string[] | null>;
  /** Byte offsets of the files this source will read, taken before the server starts. */
  snapshot?(workingDir: string): Record<string, number>;
}

/** Driven port: volatile buffer of stdout/stderr captured from the spawned process. */
export interface LogBuffer {
  open(name: string): void;
  append(name: string, line: string): void;
  read(name: string): string[];
  close(name: string): void;
}
