/** A server instance currently tracked as running. */
export interface RunningServer {
  name: string;
  port: number;
  pid?: number;
  workingDir: string;
  startedAt: number;
  /** Byte offsets of external log files at start time, so only new output is read. */
  logOffsets?: Record<string, number>;
}

export interface ServerStatus {
  running: boolean;
  port?: number;
  pid?: number;
}
