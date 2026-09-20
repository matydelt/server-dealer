import { Injectable, Logger } from '@nestjs/common';
import { ChildProcess, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { InvalidOperationError } from '../../../shared/domain/domain-error';
import {
  LaunchRequest,
  LaunchedProcess,
  ProcessRunner,
} from '../../domain/ports/process-runner.port';

/** Windows adapter: spawns detached processes and kills them with taskkill. */
@Injectable()
export class WindowsProcessRunner implements ProcessRunner {
  private readonly logger = new Logger(WindowsProcessRunner.name);

  resolveWorkingDir(exePath: string): string {
    return path.dirname(exePath);
  }

  launch({ exePath, workingDir, port }: LaunchRequest): LaunchedProcess {
    const resolvedPath = this.resolveExecutablePath(exePath);
    const options = {
      detached: true,
      windowsHide: true,
      cwd: workingDir,
      env: this.buildProcessEnv(workingDir),
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
    };

    const child = /\.(bat|cmd)$/i.test(resolvedPath)
      ? this.spawnFromBatch(resolvedPath, workingDir, port, options)
      : spawn(resolvedPath, [], options);

    return this.toLaunchedProcess(child);
  }

  kill(pid: number): void {
    exec(`taskkill /F /PID ${pid}`, (error) => {
      if (error) {
        this.logger.warn(`Could not kill PID ${pid} (it may already be dead): ${error.message}`);
      }
    });
  }

  private toLaunchedProcess(child: ChildProcess): LaunchedProcess {
    return {
      pid: child.pid,
      onOutput(listener) {
        child.stdout?.on('data', (data) => listener(`[STDOUT] ${data.toString()}`));
        child.stderr?.on('data', (data) => listener(`[STDERR] ${data.toString()}`));
        child.on('error', (error) => listener(`[ERROR] ${error.message}`));
      },
      onExit(listener) {
        child.on('exit', (code) => listener(code));
      },
    };
  }

  private spawnFromBatch(
    batPath: string,
    workingDir: string,
    port: number,
    options: Parameters<typeof spawn>[2],
  ): ChildProcess {
    const launch = this.parseBatchLaunch(batPath, workingDir, port);

    if (!launch) {
      return spawn('cmd.exe', ['/c', batPath], options);
    }

    return spawn(launch.command, launch.args, options);
  }

  private resolveExecutablePath(exePath: string): string {
    if (fs.existsSync(exePath)) {
      return exePath;
    }

    for (const extension of ['.bat', '.cmd', '.exe']) {
      const candidate = `${exePath}${extension}`;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new InvalidOperationError(`Executable not found: ${exePath}`);
  }

  private buildProcessEnv(workingDir: string): NodeJS.ProcessEnv {
    const env = { ...process.env };
    const steamAppIdPath = path.join(workingDir, 'steam_appid.txt');

    if (fs.existsSync(steamAppIdPath)) {
      const steamAppId = fs
        .readFileSync(steamAppIdPath)
        .toString('utf8')
        .replace(/\0/g, '')
        .trim();
      if (steamAppId) {
        env.SteamAppId = steamAppId;
      }
    }

    return env;
  }

  /** Pulls the first real command out of a .bat/.cmd so it can be spawned directly. */
  private parseBatchLaunch(
    batPath: string,
    workingDir: string,
    port?: number,
  ): { command: string; args: string[] } | null {
    const content = fs.readFileSync(batPath, 'utf-8');

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || /^@|^rem\s|^set\s|^echo\s|^::/i.test(trimmed)) {
        continue;
      }

      const parts = this.parseCommandLine(trimmed);
      if (parts.length === 0) {
        continue;
      }

      const [rawCommand, ...rawArgs] = parts;
      const command = this.resolveExecutablePath(
        path.isAbsolute(rawCommand) ? rawCommand : path.join(workingDir, rawCommand),
      );
      const args = port !== undefined ? this.replacePortArg(rawArgs, port) : rawArgs;

      return { command, args };
    }

    return null;
  }

  private parseCommandLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  private replacePortArg(args: string[], port: number): string[] {
    const result = [...args];
    const portIndex = result.findIndex((arg) => arg.toLowerCase() === '-port');

    if (portIndex !== -1 && portIndex + 1 < result.length) {
      result[portIndex + 1] = String(port);
    }

    return result;
  }
}
