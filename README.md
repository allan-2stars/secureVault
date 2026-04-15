# SecureVault AI

Privacy-first, local-first secure vault web app with optional AI-assisted search.

## Status

Milestone 2 foundation is in place:

- Next.js App Router shell
- TypeScript project setup
- offline base with manifest and service worker registration
- IndexedDB schema for vault settings, records, and jobs
- browser-side AES-GCM key derivation and password verification
- local setup and unlock flow for the master password

## Verification

Run the repo checks locally with:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

The same verification now runs automatically on every push to `main` and every pull request through [ci.yml](/home/sighpega/dev/secureVault/.github/workflows/ci.yml).

## Planned Next

- CRUD and local keyword search
- secret masking and reveal
- backup and restore
