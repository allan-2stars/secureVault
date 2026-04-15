# This file defines global rules for Codex.

## Project Overview
Privacy-first, local-first secure vault web app with AI-assisted search.

## Core Constraints

- NEVER send secret fields to any external service (including Chroma or AI).
- Secret fields MUST be encrypted in browser storage.
- AI search must ONLY use ai_index_text.
- Local-first architecture: IndexedDB is primary storage.
- No cloud sync, login, or payment in MVP.
- If AI (Chroma) is unavailable, fallback to keyword search.
- App must function offline (except AI search).

## Tech Stack

- Next.js (App Router)
- TypeScript
- IndexedDB
- Web Crypto API (AES-GCM)
- Pi-hosted Chroma via API

## Coding Rules

- Use TypeScript everywhere
- Functional React components only
- Small modular files
- No unnecessary dependencies
- No console logging secrets

## Execution Rules

- Work milestone by milestone
- After each milestone:
  - npm run lint
  - npm run typecheck
  - npm run build
- Do NOT refactor unrelated code