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

Modules under `backend/src/`: `servers`, `users`, `auth`, wired in `app.module.ts` (which also mounts `ServeStaticModule` for `frontend/`). `main.ts` sets global prefix `api`, a global `ValidationPipe`, and CORS `*`.

**Auth is route-list middleware, not guards.** `auth/auth.module.ts` applies `AuthMiddleware` (any valid token) and `AdminMiddleware` (admin only) to an explicit list of path+method pairs. A new endpoint is **unauthenticated unless you add it to that list**. Tokens are read from `data/users.json` on every request (`Authorization: Bearer <token>`); there is one `adminToken` plus a `users[]` array. The default admin token `admin-secret-token-123` is seeded by `UsersService` when the file is missing.

**`ServersService` is where most of the logic lives** (`backend/src/servers/servers.service.ts`):
- Config in `data/servers.json`; running-process registry in `data/running-servers.json` (persisted, so it survives API restarts). Both are re-read/re-written from disk on every call; there is no in-memory cache or locking.
- Spawns detached with `cwd` set to the exe's directory. For `.bat`/`.cmd` files it parses the first real command line out of the batch file and spawns that directly, replacing the value after `-port` with the requested port. It also injects `SteamAppId` from `steam_appid.txt` if present. Extensionless paths are resolved by trying `.bat`, `.cmd`, `.exe`.
- Stop uses `taskkill /F /PID`; restart is stop, wait 1s, start on the same port.
- Logs (`GET /servers/:name/logs`) use a fallback chain: HTTP `/logs`, `/console`, `/api/logs` on the server's port, then Unity `output_log.txt`/`Player.log` files (under the working dir and `LocalLow`, read from a byte offset snapshotted at start), then captured stdout/stderr held in the in-memory `serverLogs` map.
- `runningProcesses` and `serverLogs` are in-memory only, so they are lost on API restart while the JSON registry remains.

**Frontend** (`index.html` login, `servers.html`, `admin.html`) is standalone: each page holds its own Alpine state, stores the token in `localStorage`, and hardcodes `http://localhost:3000/api` in its `fetch` calls (changing host or port means editing every call).

## Gotchas

- `data/users.json` holds live tokens and `.gitignore` only lists `node_modules` and `dist`, so `data/` is not ignored; be careful not to commit real tokens.
- Service methods throw plain `Error` for conflicts (duplicate name, port in use, already running), which Nest returns as HTTP 500. Only "not found" cases use `NotFoundException`.
