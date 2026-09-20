import { Injectable } from '@nestjs/common';
import { LogBuffer } from '../../domain/ports/log-source.port';

/** Volatile stdout/stderr buffer; contents are lost when the API restarts. */
@Injectable()
export class InMemoryLogBuffer implements LogBuffer {
  private readonly logs = new Map<string, string[]>();

  open(name: string): void {
    this.logs.set(name, []);
  }

  append(name: string, line: string): void {
    this.logs.get(name)?.push(line);
  }

  read(name: string): string[] {
    return this.logs.get(name) ?? [];
  }

  close(name: string): void {
    this.logs.delete(name);
  }
}
