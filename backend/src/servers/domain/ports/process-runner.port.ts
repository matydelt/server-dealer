export const PROCESS_RUNNER = Symbol('ProcessRunner');

export interface LaunchRequest {
  exePath: string;
  workingDir: string;
  port: number;
}

/** A process started by the runner, exposing only what the domain needs. */
export interface LaunchedProcess {
  pid?: number;
  onOutput(listener: (line: string) => void): void;
  onExit(listener: (code: number | null) => void): void;
}

/** Driven port: starting and killing OS processes. */
export interface ProcessRunner {
  /** Directory the process must run from, derived from its executable. */
  resolveWorkingDir(exePath: string): string;
  launch(request: LaunchRequest): LaunchedProcess;
  kill(pid: number): void;
}
