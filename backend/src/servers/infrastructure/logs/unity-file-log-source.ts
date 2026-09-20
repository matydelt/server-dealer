import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RunningServer } from '../../domain/entities/running-server';
import { LogSource } from '../../domain/ports/log-source.port';

const RECENT_FILE_TOLERANCE_MS = 5000;

/**
 * Reads Unity's `output_log.txt` / `Player.log`, starting from the byte offset
 * snapshotted when the server was started so older runs are not replayed.
 */
@Injectable()
export class UnityFileLogSource implements LogSource {
  readonly name = 'unity-file';

  snapshot(workingDir: string): Record<string, number> {
    const offsets: Record<string, number> = {};

    for (const file of this.findLogFiles(workingDir)) {
      try {
        offsets[file] = fs.statSync(file).size;
      } catch {
        continue;
      }
    }

    return offsets;
  }

  read(server: RunningServer): Promise<string[] | null> {
    if (!server.workingDir) {
      return Promise.resolve(null);
    }

    for (const file of this.findLogFiles(server.workingDir, server.startedAt)) {
      const lines = this.readSince(file, server.logOffsets?.[file] ?? 0);
      if (lines.length > 0) {
        return Promise.resolve(lines);
      }
    }

    return Promise.resolve(null);
  }

  private readSince(file: string, offset: number): string[] {
    try {
      const length = fs.statSync(file).size - offset;

      if (length <= 0) {
        return [];
      }

      const buffer = Buffer.alloc(length);
      const fd = fs.openSync(file, 'r');
      try {
        fs.readSync(fd, buffer, 0, length, offset);
      } finally {
        fs.closeSync(fd);
      }

      const content = buffer.toString('utf-8');
      return content.trim() ? content.split(/\r?\n/).filter((line) => line.length > 0) : [];
    } catch {
      return [];
    }
  }

  private findLogFiles(workingDir: string, startedAt?: number): string[] {
    const candidates: string[] = [];
    const outputLog = path.join(workingDir, 'output_log.txt');

    if (fs.existsSync(outputLog) && this.isRecentFile(outputLog, startedAt)) {
      candidates.push(outputLog);
    }

    const localLow = path.join(process.env.LOCALAPPDATA ?? '', '..', 'LocalLow');
    if (fs.existsSync(localLow)) {
      candidates.push(...this.findPlayerLogs(localLow, startedAt));
    }

    return candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  }

  private findPlayerLogs(dir: string, startedAt?: number): string[] {
    const results: string[] = [];
    const stack = [dir];

    while (stack.length > 0) {
      const current = stack.pop()!;

      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);

        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }

        if (entry.name.toLowerCase() === 'player.log' && this.isRecentFile(fullPath, startedAt)) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }

  private isRecentFile(filePath: string, startedAt?: number): boolean {
    if (!startedAt) {
      return true;
    }

    try {
      return fs.statSync(filePath).mtimeMs >= startedAt - RECENT_FILE_TOLERANCE_MS;
    } catch {
      return false;
    }
  }
}
