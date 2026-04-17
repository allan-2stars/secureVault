# SecureVault AI

Privacy-first, local-first secure vault web app with optional AI-assisted search.

## Status

Milestone 5 foundation is in place:

- Next.js App Router shell
- TypeScript project setup
- offline base with manifest and service worker registration
- IndexedDB schema for vault settings, records, and jobs
- browser-side AES-GCM key derivation and password verification
- local setup and unlock flow for the master password
- encrypted record CRUD with explicit reveal/hide
- local keyword search over safe metadata only
- Pi FastAPI AI sync with IndexedDB retry queue and non-blocking local saves

## Verification

Run the repo checks locally with:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

The same verification now runs automatically on every push to `main` and every pull request through [ci.yml](/home/sighpega/dev/secureVault/.github/workflows/ci.yml).

## Planned Next

- semantic AI query UI and result ranking
- Chroma/Pi failure fallback behavior in the search experience
- backup and restore
