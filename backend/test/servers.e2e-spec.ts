import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';

const ADMIN = 'admin-secret-token-123';
const USER_TOKEN = 'user-token-abc';

const originalCwd = process.cwd();
const fixtureScript = path.join(originalCwd, 'test', 'fixtures', 'fake-server.js');

let app: INestApplication;
let tmpDir: string;
let batPath: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const admin = () => auth(ADMIN);
const user = () => auth(USER_TOKEN);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const http = () => request(app.getHttpServer());

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.once('error', () => resolve(false));
  });
}

async function waitForPort(port: number, open = true, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await isPortOpen(port)) === open) return;
    await sleep(100);
  }
  throw new Error(`Port ${port} never became ${open ? 'open' : 'closed'}`);
}

const createServer = (name = 'srv1', exePath = batPath) =>
  http().post('/api/servers').set(admin()).send({ name, exePath });

async function startServer(name = 'srv1') {
  const port = await getFreePort();
  const res = await http().post('/api/servers/start').set(user()).send({ name, port });
  return { res, port };
}

async function stopAllRunning() {
  const running = await http().get('/api/servers/running').set(admin());
  for (const s of running.body ?? []) {
    await http().post(`/api/servers/stop/${s.name}`).set(admin());
  }
  if (running.body?.length) await sleep(500);
}

function resetData() {
  const data = path.join(tmpDir, 'data');
  fs.writeFileSync(path.join(data, 'servers.json'), '[]');
  fs.writeFileSync(path.join(data, 'running-servers.json'), '{}');
}

const readData = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(tmpDir, 'data', file), 'utf-8'));

describe('Servers module (e2e)', () => {
  beforeAll(async () => {
    // Services resolve `data/` from process.cwd(), so isolate it in a temp dir.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-dealer-e2e-'));
    process.chdir(tmpDir);

    batPath = path.join(tmpDir, 'start.bat');
    fs.writeFileSync(batPath, `@echo off\r\n"${process.execPath}" "${fixtureScript}" -port 0\r\n`);

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api');
    await app.init();

    // Register a regular user directly in the users file.
    const usersFile = path.join(tmpDir, 'data', 'users.json');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    users.users.push({ name: 'bob', token: USER_TOKEN });
    fs.writeFileSync(usersFile, JSON.stringify(users));
  });

  afterEach(async () => {
    await stopAllRunning();
    resetData();
  });

  afterAll(async () => {
    await app.close();
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('authentication & authorization', () => {
    it('rejects requests without a token', async () => {
      await http().get('/api/servers').expect(403);
    });

    it('rejects an invalid token', async () => {
      await http().get('/api/servers').set(auth('nope')).expect(403);
    });

    it('lets a regular user read servers', async () => {
      await http().get('/api/servers').set(user()).expect(200);
      await http().get('/api/servers/running').set(user()).expect(200);
    });

    it('forbids a regular user from creating, updating and deleting servers', async () => {
      await createServer();
      await http().post('/api/servers').set(user()).send({ name: 'x', exePath: batPath }).expect(403);
      await http().put('/api/servers/srv1').set(user()).send({ exePath: 'y' }).expect(403);
      await http().delete('/api/servers/srv1').set(user()).expect(403);
    });

    it('requires a token to start, stop, restart, status and logs', async () => {
      await http().post('/api/servers/start').send({ name: 'a', port: 1 }).expect(403);
      await http().post('/api/servers/stop/a').expect(403);
      await http().post('/api/servers/restart/a').expect(403);
      await http().get('/api/servers/a/status').expect(403);
      await http().get('/api/servers/a/logs').expect(403);
    });
  });

  describe('server configuration CRUD', () => {
    it('starts with an empty list', async () => {
      const res = await http().get('/api/servers').set(admin()).expect(200);
      expect(res.body).toEqual([]);
    });

    it('creates a server and persists it', async () => {
      const res = await createServer('alpha').expect(201);
      expect(res.body).toEqual({ name: 'alpha', exePath: batPath });

      const list = await http().get('/api/servers').set(user()).expect(200);
      expect(list.body).toEqual([{ name: 'alpha', exePath: batPath }]);
      expect(readData('servers.json')).toHaveLength(1);
    });

    it('validates the create payload', async () => {
      await http().post('/api/servers').set(admin()).send({}).expect(400);
      await http().post('/api/servers').set(admin()).send({ name: 'a' }).expect(400);
      await http().post('/api/servers').set(admin()).send({ name: '', exePath: 'x' }).expect(400);
      await http().post('/api/servers').set(admin()).send({ name: 1, exePath: 'x' }).expect(400);
    });

    it('rejects a duplicate name with a conflict (409)', async () => {
      await createServer('dup').expect(201);
      const res = await createServer('dup');
      expect(res.status).toBe(409);
      expect(readData('servers.json')).toHaveLength(1);
    });

    it('updates the exePath', async () => {
      await createServer('alpha').expect(201);
      const res = await http()
        .put('/api/servers/alpha')
        .set(admin())
        .send({ exePath: 'C:\\new\\path.exe' })
        .expect(200);
      expect(res.body).toEqual({ name: 'alpha', exePath: 'C:\\new\\path.exe' });
      expect(readData('servers.json')[0].exePath).toBe('C:\\new\\path.exe');
    });

    it('returns 404 when updating an unknown server', async () => {
      await http().put('/api/servers/ghost').set(admin()).send({ exePath: 'x' }).expect(404);
    });

    it('deletes a server', async () => {
      await createServer('alpha').expect(201);
      await http().delete('/api/servers/alpha').set(admin()).expect(200);
      expect(readData('servers.json')).toEqual([]);
    });

    it('returns 404 when deleting an unknown server', async () => {
      await http().delete('/api/servers/ghost').set(admin()).expect(404);
    });
  });

  describe('process lifecycle', () => {
    it('starts a server from a .bat, applying the requested port', async () => {
      await createServer().expect(201);
      const { res, port } = await startServer();
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'srv1', port, workingDir: tmpDir });
      expect(typeof res.body.pid).toBe('number');

      // The fake server only listens if the -port arg was rewritten from 0 to `port`.
      await waitForPort(port);
    });

    it('lists the running server and reports its status', async () => {
      await createServer().expect(201);
      const { port } = await startServer();

      const running = await http().get('/api/servers/running').set(user()).expect(200);
      expect(running.body).toHaveLength(1);
      expect(running.body[0]).toMatchObject({ name: 'srv1', port });
      expect(readData('running-servers.json').srv1.port).toBe(port);

      const status = await http().get('/api/servers/srv1/status').set(user()).expect(200);
      expect(status.body).toMatchObject({ running: true, port });
    });

    it('reports a stopped server as not running', async () => {
      await createServer().expect(201);
      const status = await http().get('/api/servers/srv1/status').set(user()).expect(200);
      expect(status.body).toEqual({ running: false });
    });

    it('returns 404 when starting an unconfigured server', async () => {
      const res = await http()
        .post('/api/servers/start')
        .set(user())
        .send({ name: 'ghost', port: 45000 });
      expect(res.status).toBe(404);
    });

    it('validates the start payload', async () => {
      await http().post('/api/servers/start').set(user()).send({}).expect(400);
      await http().post('/api/servers/start').set(user()).send({ name: 'a', port: 'abc' }).expect(400);
    });

    it('rejects starting a server that is already running (409)', async () => {
      await createServer().expect(201);
      await startServer();
      const second = await startServer();
      expect(second.res.status).toBe(409);
    });

    it('rejects starting on a port that is already in use (409)', async () => {
      await createServer().expect(201);
      const blocker = net.createServer();
      const port = await new Promise<number>((resolve) =>
        blocker.listen(0, () => resolve((blocker.address() as net.AddressInfo).port)),
      );
      try {
        const res = await http().post('/api/servers/start').set(user()).send({ name: 'srv1', port });
        expect(res.status).toBe(409);
      } finally {
        blocker.close();
      }
    });

    it('fails to start when the executable does not exist', async () => {
      await createServer('broken', path.join(tmpDir, 'missing.bat')).expect(201);
      const res = await http()
        .post('/api/servers/start')
        .set(user())
        .send({ name: 'broken', port: await getFreePort() });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(readData('running-servers.json')).toEqual({});
    });

    it('stops a running server and frees its port', async () => {
      await createServer().expect(201);
      const { port } = await startServer();
      await waitForPort(port);

      await http().post('/api/servers/stop/srv1').set(user()).expect(201);
      expect(readData('running-servers.json')).toEqual({});
      await waitForPort(port, false, 5000);
    });

    it('returns 404 when stopping a server that is not running', async () => {
      await http().post('/api/servers/stop/ghost').set(user()).expect(404);
    });

    it('restarts a running server on the same port with a new pid', async () => {
      await createServer().expect(201);
      const { res: first, port } = await startServer();
      await waitForPort(port);

      const res = await http().post('/api/servers/restart/srv1').set(user()).expect(201);
      expect(res.body.port).toBe(port);
      expect(res.body.pid).not.toBe(first.body.pid);
      await waitForPort(port);
    });

    it('returns 404 when restarting a server that is not running', async () => {
      await http().post('/api/servers/restart/ghost').set(user()).expect(404);
    });

    it('removes the running entry when a running server is deleted', async () => {
      await createServer().expect(201);
      await startServer();
      await http().delete('/api/servers/srv1').set(admin()).expect(200);
      expect(readData('running-servers.json')).toEqual({});
    });

    it('drops the running entry when the process exits by itself', async () => {
      await createServer().expect(201);
      const { res } = await startServer();
      process.kill(res.body.pid);

      const deadline = Date.now() + 5000;
      while (Object.keys(readData('running-servers.json')).length && Date.now() < deadline) {
        await sleep(200);
      }
      expect(readData('running-servers.json')).toEqual({});
    });
  });

  describe('logs', () => {
    it('returns 404 for a server that is not running', async () => {
      await http().get('/api/servers/ghost/logs').set(user()).expect(404);
    });

    it("fetches logs from the server's own /logs endpoint", async () => {
      await createServer().expect(201);
      const { port } = await startServer();
      await waitForPort(port);

      const res = await http().get('/api/servers/srv1/logs').set(user()).expect(200);
      expect(res.body).toEqual(['line one', 'line two']);
    });
  });
});
