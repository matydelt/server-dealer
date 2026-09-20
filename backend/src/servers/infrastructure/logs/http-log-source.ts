import { Injectable } from '@nestjs/common';
import { RunningServer } from '../../domain/entities/running-server';
import { LogSource } from '../../domain/ports/log-source.port';

const ENDPOINTS = ['/logs', '/console', '/api/logs'];
const REQUEST_TIMEOUT_MS = 3000;

/** Asks the game server itself for its logs over HTTP, if it exposes them. */
@Injectable()
export class HttpLogSource implements LogSource {
  readonly name = 'http';

  async read(server: RunningServer): Promise<string[] | null> {
    for (const endpoint of ENDPOINTS) {
      const text = await this.fetchText(`http://127.0.0.1:${server.port}${endpoint}`);

      if (text === null) {
        continue;
      }

      return text.trim() ? text.split(/\r?\n/).filter((line) => line.length > 0) : [];
    }

    return null;
  }

  private async fetchText(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response.ok ? await response.text() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
