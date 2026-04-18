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
