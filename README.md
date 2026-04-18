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
