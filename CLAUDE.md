# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

NestJS 11 API (README is in Spanish) that manages game-server executables on **Windows**: register a server config (name + exe/bat path), then start/stop/restart it on a given port. The repo is split into `backend/` (NestJS app, all npm tooling, `data/`) and `frontend/` (no-build Alpine.js pages, served statically by the backend via `ServeStaticModule` at `../../frontend` relative to `backend/dist`). There is no database: all state lives in JSON files under `data/`.

## Commands

Run all npm commands from `backend/`. `data/` resolves from `process.cwd()`, so start the API from there too.

- `npm run start:dev`: run with watch (API at `http://localhost:3000/api`, frontend at `http://localhost:3000`)
- `npm run build` then `npm run start:prod`: production (`node dist/main`)
- `npm run lint`: ESLint with `--fix` (modifies files)
- `npm run format`: Prettier over `src/**/*.ts`
- `npm test`: Jest (unit tests are `backend/src/**/*.spec.ts`; none exist yet). Single test: `npx jest path/to/file.spec.ts -t "name"`
- `npm run test:e2e` references `backend/test/jest-e2e.json`, which does not exist yet.

Paths and process handling (`taskkill`, `cmd.exe`, `LOCALAPPDATA`) are Windows-only.

## Architecture

The backend follows **hexagonal architecture (ports & adapters)**. Each bounded context under `backend/src/` (`servers`, `users`) is split into three layers, plus a framework-agnostic `shared/` kernel:

```
<context>/
  domain/         entities + port interfaces (no NestJS, no fs, no express)
  application/    use-cases, one class per operation, depending only on ports
  infrastructure/ adapters: persistence/, process/, logs/, http/ (controllers + DTOs)
  <context>.module.ts   composition root: binds each port symbol to an adapter
```

Dependencies point inward only: `infrastructure -> application -> domain`. A port is a `Symbol` + interface exported from `domain/ports/`; use cases receive them with `@Inject(THE_SYMBOL)` and the module decides the implementation.

Ports and their current adapters:

| Port (`servers/domain/ports`) | Adapter |
| --- | --- |
| `SERVER_CONFIG_REPOSITORY` | `JsonServerConfigRepository` (`data/servers.json`) |
| `RUNNING_SERVER_REPOSITORY` | `JsonRunningServerRepository` (`data/running-servers.json`) |
| `PROCESS_RUNNER` | `WindowsProcessRunner` (spawn detached, `taskkill`, `.bat` parsing, `SteamAppId`) |
| `PORT_CHECKER` | `TcpPortChecker` (tries to bind the port) |
| `LOG_BUFFER` | `InMemoryLogBuffer` (captured stdout/stderr, lost on restart) |
| `LOG_SOURCES` | `[HttpLogSource, UnityFileLogSource]`, tried in order |
| `USER_REPOSITORY` (`users/domain/ports`) | `JsonUserRepository` (`data/users.json`) |

Adding a persistence backend, swapping Windows process handling, or faking anything in a test means writing a new adapter and changing one line in the module — nothing in `domain/` or `application/` moves.

Conventions worth keeping:
- **Use cases are the unit of application logic.** One public `execute()` per class; a new endpoint gets a new use case, not a method on an existing one.
- **Domain errors, not HTTP exceptions.** `application/` and `domain/` throw `ResourceNotFoundError`, `ConflictError`, `InvalidOperationError` or `ForbiddenError` from `shared/domain/domain-error.ts`. The global `DomainErrorFilter` (registered in `main.ts`) maps them to 404 / 409 / 400 / 403. Never import `@nestjs/common` exceptions outside `infrastructure/`.
- **`LogSource.read()` returns `null` to mean "no answer, try the next source"** and `[]` to mean "this source is authoritative and there is nothing". `GetServerLogsUseCase` falls back to the in-memory buffer when every source returns `null`.
- **`JsonFileStore`** (`shared/infrastructure/persistence`) is the only place that touches disk for state; it re-reads and re-writes the whole file on each call, with no cache or locking.

`app.module.ts` wires `ServersModule`, `AuthModule`, `UsersModule` and mounts `ServeStaticModule` for `frontend/`. `main.ts` sets global prefix `api`, a global `ValidationPipe`, the `DomainErrorFilter`, and CORS `*`.

**Auth is route-list middleware, not guards.** `auth/auth.module.ts` applies `AuthMiddleware` (any valid token) and `AdminMiddleware` (admin only) to an explicit list of path+method pairs. A new endpoint is **unauthenticated unless you add it to that list**. Both middlewares are thin adapters in `auth/infrastructure/http/` that delegate to `AuthenticateTokenUseCase`, exported by `UsersModule`; tokens are read from `data/users.json` on every request (`Authorization: Bearer <token>`). The default admin token `admin-secret-token-123` is seeded when the file is missing.

**Process behaviour** (all inside `WindowsProcessRunner`): spawns detached with `cwd` set to the exe's directory; for `.bat`/`.cmd` it parses the first real command line out of the batch file and spawns that directly, replacing the value after `-port` with the requested port; injects `SteamAppId` from `steam_appid.txt` if present; extensionless paths are resolved by trying `.bat`, `.cmd`, `.exe`. Stop uses `taskkill /F /PID`; restart is stop, wait 1s, start on the same port.

**Logs** (`GET /servers/:name/logs`) use a fallback chain: `HttpLogSource` tries `/logs`, `/console`, `/api/logs` on the server's port, then `UnityFileLogSource` reads `output_log.txt`/`Player.log` (under the working dir and `LocalLow`) from a byte offset snapshotted at start, then the `InMemoryLogBuffer`. The buffer is in-memory only, so it is lost on API restart while the JSON registry survives.

**Frontend** (`index.html` login, `servers.html`, `admin.html`) is standalone: each page holds its own Alpine state, stores the token in `localStorage`, and hardcodes `http://localhost:3000/api` in its `fetch` calls (changing host or port means editing every call).

## Gotchas

- `data/users.json` holds live tokens and `.gitignore` only lists `node_modules` and `dist`, so `data/` is not ignored; be careful not to commit real tokens.
- The frontend still only checks for `ok`/non-`ok` responses, so the 409/400 statuses the `DomainErrorFilter` now returns are surfaced as generic errors there.
