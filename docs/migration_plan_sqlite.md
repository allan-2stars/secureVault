# SQLite Migration Plan

This migration is incremental. The current app remains functional while durable local storage is introduced behind a Local Vault API.

## Phase 1

Deliver now:
- Local Vault API scaffold
- SQLite connection module
- schema initialization logic
- `PRAGMA foreign_keys = ON`
- health endpoint
- smoke-tested database initialization

Do not do yet:
- frontend cutover
- record CRUD cutover
- search cutover
- removal of IndexedDB

## Phase 2

Next:
- add Local Vault API CRUD endpoints
- map current record model into SQLite-backed services
- keep request/response contracts stable and minimal
- begin low-risk read/write integration from the frontend

## Phase 3

Later:
- migrate retry jobs to SQLite-backed durability
- transition backup/restore to API-backed durable storage
- keep Pi API contract unchanged

## Phase 4

Final cutover:
- make SQLite the source of truth
- reduce IndexedDB to transitional/offline cache needs only if still justified
- preserve encryption and data exposure rules
