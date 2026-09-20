import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServerDto } from './dtos/create-server.dto';
import { StartServerDto } from './dtos/start-server.dto';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';

export interface ServerConfig {
  name: string;
  exePath: string;
}

export interface RunningServer {
  name: string;
  port: number;
  pid?: number;
  workingDir: string;
  startedAt: number;
  logOffsets?: Record<string, number>;
}

@Injectable()
export class ServersService {
  private serversPath = path.join(process.cwd(), 'data', 'servers.json');
  private runningServersPath = path.join(process.cwd(), 'data', 'running-servers.json');
  private runningProcesses: Map<string, any> = new Map();
  private serverLogs: Map<string, string[]> = new Map();

  constructor() {
    this.ensureDataFilesExist();
  }

  private ensureDataFilesExist() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.serversPath)) {
      fs.writeFileSync(this.serversPath, '[]');
    }
    if (!fs.existsSync(this.runningServersPath)) {
      fs.writeFileSync(this.runningServersPath, '{}');
    }
  }

  private isPortInUse(port: number): Promise<boolean> {
    const net = require('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(true);
      });
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port);
    });
  }

  private readServers(): ServerConfig[] {
    try {
      const data = fs.readFileSync(this.serversPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private writeServers(servers: ServerConfig[]) {
    fs.writeFileSync(this.serversPath, JSON.stringify(servers, null, 2));
  }

  private readRunningServers(): Record<string, RunningServer> {
    try {
      const data = fs.readFileSync(this.runningServersPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  private writeRunningServers(servers: Record<string, RunningServer>) {
    fs.writeFileSync(this.runningServersPath, JSON.stringify(servers, null, 2));
  }

  private appendLog(name: string, line: string) {
    const logs = this.serverLogs.get(name);
    if (!logs) {
      return;
    }

    logs.push(line);
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

    throw new Error(`Executable not found: ${exePath}`);
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

  private spawnServerProcess(exePath: string, workingDir: string, port?: number) {
    const resolvedPath = this.resolveExecutablePath(exePath);
    const env = this.buildProcessEnv(workingDir);
    const spawnOptions = {
      detached: true,
      windowsHide: true,
      cwd: workingDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
    };

    if (/\.(bat|cmd)$/i.test(resolvedPath)) {
      const launch = this.parseBatchLaunch(resolvedPath, workingDir, port);
      if (launch) {
        return spawn(launch.command, launch.args, spawnOptions);
      }

      return spawn('cmd.exe', ['/c', resolvedPath], spawnOptions);
    }

    return spawn(resolvedPath, [], spawnOptions);
  }

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

      let command = parts[0];
      let args = parts.slice(1);

      if (!path.isAbsolute(command)) {
        command = this.resolveExecutablePath(path.join(workingDir, command));
      } else {
        command = this.resolveExecutablePath(command);
      }

      if (port !== undefined) {
        args = this.replacePortArg(args, port);
      }

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

  getAllServers(): ServerConfig[] {
    return this.readServers();
  }

  createServer(createServerDto: CreateServerDto): ServerConfig {
    const servers = this.readServers();
    
    if (servers.find(s => s.name === createServerDto.name)) {
      throw new Error('Server with this name already exists');
    }

    const newServer: ServerConfig = {
      name: createServerDto.name,
      exePath: createServerDto.exePath,
    };

    servers.push(newServer);
    this.writeServers(servers);
    return newServer;
  }

  deleteServer(name: string): void {
    const servers = this.readServers();
    const filteredServers = servers.filter(s => s.name !== name);
    
    if (servers.length === filteredServers.length) {
      throw new NotFoundException('Server not found');
    }

    this.writeServers(filteredServers);
    
    // Also remove from running servers if it's running
    const runningServers = this.readRunningServers();
    delete runningServers[name];
    this.writeRunningServers(runningServers);
  }

  updateServer(name: string, updateData: { exePath?: string }): ServerConfig {
    const servers = this.readServers();
    const serverIndex = servers.findIndex(s => s.name === name);
    
    if (serverIndex === -1) {
      throw new NotFoundException('Server not found');
    }

    if (updateData.exePath) {
      servers[serverIndex].exePath = updateData.exePath;
    }

    this.writeServers(servers);
    return servers[serverIndex];
  }

  getRunningServers(): RunningServer[] {
    const runningServers = this.readRunningServers();
    return Object.values(runningServers);
  }

  async startServer(startServerDto: StartServerDto): Promise<RunningServer> {
    const servers = this.readServers();
    const serverConfig = servers.find(s => s.name === startServerDto.name);

    if (!serverConfig) {
      throw new NotFoundException('Server configuration not found');
    }

    const runningServers = this.readRunningServers();

    if (runningServers[startServerDto.name]) {
      throw new Error('Server is already running');
    }

    // Check if port is already in use
    const portInUse = await this.isPortInUse(startServerDto.port);
    if (portInUse) {
      throw new Error(`Port ${startServerDto.port} is already in use`);
    }

    // Initialize logs for this server
    this.serverLogs.set(startServerDto.name, []);

    // Get the directory of the executable to set as working directory
    const exeDir = path.dirname(serverConfig.exePath);
    const logOffsets = this.captureLogSnapshot(exeDir);

    let process;
    try {
      process = this.spawnServerProcess(serverConfig.exePath, exeDir, startServerDto.port);
    } catch (error) {
      this.serverLogs.delete(startServerDto.name);
      throw error;
    }

    process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.appendLog(startServerDto.name, `[ERROR] Process exited with code ${code}`);
      }

      const currentRunning = this.readRunningServers();
      if (currentRunning[startServerDto.name]?.pid === process.pid) {
        delete currentRunning[startServerDto.name];
        this.writeRunningServers(currentRunning);
        this.runningProcesses.delete(startServerDto.name);
        this.serverLogs.delete(startServerDto.name);
      }
    });

    process.stdout?.on('data', (data) => {
      this.appendLog(startServerDto.name, `[STDOUT] ${data.toString()}`);
    });

    process.stderr?.on('data', (data) => {
      this.appendLog(startServerDto.name, `[STDERR] ${data.toString()}`);
    });

    process.on('error', (error) => {
      this.appendLog(startServerDto.name, `[ERROR] ${error.message}`);
    });

    const runningServer: RunningServer = {
      name: startServerDto.name,
      port: startServerDto.port,
      pid: process.pid,
      workingDir: exeDir,
      startedAt: Date.now(),
      logOffsets,
    };

    runningServers[startServerDto.name] = runningServer;
    this.writeRunningServers(runningServers);

    this.runningProcesses.set(startServerDto.name, process);

    return runningServer;
  }

  stopServer(name: string): void {
    const runningServers = this.readRunningServers();
    const runningServer = runningServers[name];

    if (!runningServer) {
      throw new NotFoundException('Server is not running');
    }

    if (runningServer.pid) {
      try {
        // Kill the process on Windows
        exec(`taskkill /F /PID ${runningServer.pid}`, (error) => {
          if (error) {
            // If process is already dead, just log and continue
            console.error(`Error killing process (may already be dead): ${error.message}`);
          }
        });
      } catch (error) {
        console.error(`Error stopping server: ${error}`);
      }
    }

    // Always clean up the running server record
    delete runningServers[name];
    this.writeRunningServers(runningServers);

    this.runningProcesses.delete(name);
    this.serverLogs.delete(name);
  }

  restartServer(name: string): Promise<RunningServer> {
    const runningServers = this.readRunningServers();
    const runningServer = runningServers[name];

    if (!runningServer) {
      throw new NotFoundException('Server is not running');
    }

    const port = runningServer.port;
    this.stopServer(name);

    // Wait a bit before restarting
    return new Promise((resolve) => {
      setTimeout(() => {
        this.startServer({ name, port }).then(resolve);
      }, 1000);
    });
  }

  async getServerLogs(name: string): Promise<string[]> {
    const runningServers = this.readRunningServers();
    const runningServer = runningServers[name];

    if (!runningServer) {
      throw new NotFoundException('Server not found or not running');
    }

    const portLogs = await this.fetchLogsFromPort(runningServer.port);
    if (portLogs !== null) {
      return portLogs;
    }

    const workingDir = runningServer.workingDir ?? this.getServerWorkingDir(name);
    if (workingDir) {
      const consoleLogs = this.readConsoleLogFiles(
        workingDir,
        runningServer.startedAt,
        runningServer.logOffsets,
      );
      if (consoleLogs.length > 0) {
        return consoleLogs;
      }
    }

    return this.serverLogs.get(name) ?? [];
  }

  private getServerWorkingDir(name: string): string | null {
    const serverConfig = this.readServers().find((s) => s.name === name);
    if (!serverConfig) {
      return null;
    }

    return path.dirname(serverConfig.exePath);
  }

  private captureLogSnapshot(workingDir: string): Record<string, number> {
    const snapshot: Record<string, number> = {};

    for (const file of this.findConsoleLogFiles(workingDir)) {
      try {
        snapshot[file] = fs.statSync(file).size;
      } catch {
        continue;
      }
    }

    return snapshot;
  }

  private readConsoleLogFiles(
    workingDir: string,
    startedAt?: number,
    logOffsets?: Record<string, number>,
  ): string[] {
    const logFiles = this.findConsoleLogFiles(workingDir, startedAt);

    for (const file of logFiles) {
      try {
        const offset = logOffsets?.[file] ?? 0;
        const stat = fs.statSync(file);
        const length = stat.size - offset;

        if (length <= 0) {
          continue;
        }

        const buffer = Buffer.alloc(length);
        const fd = fs.openSync(file, 'r');
        fs.readSync(fd, buffer, 0, length, offset);
        fs.closeSync(fd);

        const content = buffer.toString('utf-8');
        if (!content.trim()) {
          continue;
        }

        return content.split(/\r?\n/).filter((line) => line.length > 0);
      } catch {
        continue;
      }
    }

    return [];
  }

  private findConsoleLogFiles(workingDir: string, startedAt?: number): string[] {
    const candidates: string[] = [];
    const outputLog = path.join(workingDir, 'output_log.txt');

    if (fs.existsSync(outputLog) && this.isRecentFile(outputLog, startedAt)) {
      candidates.push(outputLog);
    }

    const localLow = path.join(process.env.LOCALAPPDATA ?? '', '..', 'LocalLow');
    if (fs.existsSync(localLow)) {
      candidates.push(...this.findRecentPlayerLogs(localLow, startedAt));
    }

    return candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  }

  private findRecentPlayerLogs(dir: string, startedAt?: number): string[] {
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

        if (entry.name.toLowerCase() !== 'player.log') {
          continue;
        }

        if (this.isRecentFile(fullPath, startedAt)) {
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
      return fs.statSync(filePath).mtimeMs >= startedAt - 5000;
    } catch {
      return false;
    }
  }

  private async fetchLogsFromPort(port: number): Promise<string[] | null> {
    const endpoints = ['/logs', '/console', '/api/logs'];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          continue;
        }

        const text = await response.text();
        if (!text.trim()) {
          return [];
        }

        return text.split(/\r?\n/).filter((line) => line.length > 0);
      } catch {
        continue;
      }
    }

    return null;
  }

  getServerStatus(name: string): { running: boolean; port?: number; pid?: number } {
    const runningServers = this.readRunningServers();
    const runningServer = runningServers[name];

    if (!runningServer) {
      return { running: false };
    }

    return {
      running: true,
      port: runningServer.port,
      pid: runningServer.pid,
    };
  }
}
