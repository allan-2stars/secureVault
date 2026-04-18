# SecureVault AI

Privacy-first, local-first secure vault web app with optional AI-assisted search.

## Status

The SQLite migration is effectively complete:

- Next.js App Router shell
- Local Vault API + SQLite durable storage boundary
- browser-side AES-GCM key derivation and password verification
- vault setup and unlock tied to SQLite-backed verifier metadata
- encrypted record CRUD with explicit reveal/hide
- local keyword search over safe metadata only
- SQLite-backed jobs queue and backup/restore
- Pi FastAPI AI sync with a durable local retry queue

## Runtime Boundaries

- Frontend: Next.js UI and in-memory session state
- Local Vault API: local HTTP boundary for durable vault operations
- SQLite: source of truth for settings, records, jobs, backup/export, and restore/import
- Pi wrapper: semantic search/index service that receives only approved `ai_index_text`

IndexedDB is no longer the primary persistence layer.

## Verification

Run the repo checks locally with:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

The same verification now runs automatically on every push to `main` and every pull request through [ci.yml](/home/sighpega/dev/secureVault/.github/workflows/ci.yml).

## Next Packaging Step

- prepare local desktop packaging around the existing split between:
  - Next.js frontend
  - Local Vault API
  - SQLite durable store
  - Pi semantic search service

## Packaging Readiness

- Tauri planning notes live in [docs/tauri_packaging_readiness.md](/home/sighpega/dev/secureVault/docs/tauri_packaging_readiness.md)
- frontend env example lives in [.env.example](/home/sighpega/dev/secureVault/.env.example)
- Local Vault API env example lives in [local-vault-api/.env.example](/home/sighpega/dev/secureVault/local-vault-api/.env.example)

## Desktop Dev

- Tauri scaffold now lives in [src-tauri](/home/sighpega/dev/secureVault/src-tauri)
- desktop web build uses `npm run build:desktop-web`
- desktop prerequisite check uses `npm run tauri:doctor`
- Tauri dev/build commands are:
  - `npm run tauri:dev`
  - `npm run tauri:build`

Current Milestone 8 implementation launches the Local Vault API as a Python sidecar process and stores SQLite in the desktop app-data directory.

## Tauri Prerequisites

Desktop packaging needs more than Node.js:

- Rust/Cargo must be installed and available on `PATH`
- `python3` must be available on `PATH` for the current Local Vault API sidecar launcher
- Linux also needs the Tauri system packages documented at the official prerequisites page:
  - https://v2.tauri.app/start/prerequisites/

If `npm run tauri:build` fails immediately, run:

- `npm run tauri:doctor`

That command checks the local machine for the desktop build prerequisites and prints the missing step.

## Current Status

SecureVault AI now runs with a Local Vault API + SQLite durable storage boundary.

Implemented so far:

- SQLite-backed vault settings, records, jobs, backup, and restore
- master-password setup and unlock tied to durable SQLite metadata
- encrypted local record CRUD with reveal/hide behavior
- duplicate-title protection
- local keyword search over safe metadata
- Pi-backed semantic search using safe `ai_index_text` only
- AI retry queue with durable local persistence
- backup/export and restore/import with reindex support
- Tauri desktop scaffold with Local Vault API sidecar startup

Desktop runtime notes:

- web mode and desktop mode currently use different SQLite file locations
- web testing typically uses the repo-local SQLite database
- desktop Tauri uses the OS app-data SQLite database
- because of that, the desktop app may look like a fresh vault on first run even when the web app already has records
- to move existing web data into desktop, export a backup from web mode and restore it in desktop mode

Development commands:

- web app:
  - run Local Vault API with `uvicorn`
  - run frontend with `npm run dev`
- desktop dev:
  - run `npm run tauri:dev`
- desktop package build:
  - run `npm run tauri:build`

Current focus:

- stabilize desktop runtime behavior
- validate desktop persistence and backup/restore flow
- confirm end-to-end migration from web vault data into desktop vault data

## Migrate Web Data To Desktop

1. Start the web app with your existing repo-local database.
2. Unlock with your current master password.
3. Export a backup JSON.
4. Start the desktop app with `npm run tauri:dev`.
5. If desktop shows fresh setup, create the desktop vault first.
6. Restore the backup JSON into desktop.
7. If prompted, unlock with the backup's original master password.
8. Confirm your records appear in the desktop app.
