import * as fs from 'fs';
import * as path from 'path';

/**
 * Tiny JSON-file store: the whole document is re-read and re-written on every
 * access, which keeps the API restart-safe at the cost of any caching.
 */
export class JsonFileStore<T> {
  private readonly filePath: string;

  constructor(
    fileName: string,
    private readonly defaultValue: () => T,
  ) {
    const dataDir = path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(this.filePath)) {
      this.write(this.defaultValue());
    }
  }

  read(): T {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as T;
    } catch {
      return this.defaultValue();
    }
  }

  write(value: T): void {
    fs.writeFileSync(this.filePath, JSON.stringify(value, null, 2));
  }
}
