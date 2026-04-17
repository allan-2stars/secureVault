Proceed to SQLite Migration Phase 6: migrate the jobs / retry queue from IndexedDB to the Local Vault API + SQLite.

Current status:
- SQLite migration Phase 1 is complete
- SQLite migration Phase 2 is complete
- frontend settings cutover has begun
- record listing and record reads have been migrated or are in progress through the Local Vault API
- record create/update/delete now go through the Local Vault API first
- SQLite is now the primary durable backend for record writes
- IndexedDB still remains as transitional support for jobs, backup/restore, settings, fallback reads, and mirrored compatibility copies
- Pi/Chroma integration remains unchanged and working

Goal of this phase:
- make the jobs queue durable in SQLite through the Local Vault API
- remove IndexedDB as the primary retry queue store
- preserve current retry/reindex behavior as much as possible
- keep migration incremental and low-risk

Constraints:
- Do NOT redesign Pi/Chroma integration
- Do NOT change the data exposure policy
- Do NOT add sync, login, payment, admin, or mobile support
- Do NOT remove IndexedDB completely yet
- Do NOT redesign backup/restore in this phase except for minimal compatibility work
- Do NOT over-refactor the UI

Read and follow:
- AGENTS.md
- docs/PRD_v1_1.md
- docs/architecture.md
- docs/data_exposure_policy.md
- docs/sqlite_target_schema.md
- docs/migration_plan_sqlite.md
- docs/acceptance_criteria.md
- docs/test_strategy.md

Scope for this phase:
1. Migrate jobs / retry queue persistence to the Local Vault API + SQLite
2. Make SQLite the primary durable store for queued AI index jobs
3. Keep request/response shapes close to the current frontend jobs model
4. Update the frontend repository/adapter layer so job creation, reads, updates, and deletes use the Local Vault API first
5. Keep IndexedDB jobs support only as tightly-scoped fallback or temporary compatibility if absolutely necessary
6. Preserve current AI reindex / retry behavior as much as possible
7. Ensure record index_status updates remain consistent with the migrated jobs flow

Implementation guidance:
- prefer the smallest possible change set
- keep queue logic modular
- do not redesign the retry algorithm unless a minimal fix is needed
- preserve current failure handling semantics where possible
- make Local Vault API the source of truth for pending/retry/completed jobs
- avoid long-term dual-write unless strictly necessary and clearly documented
- if temporary compatibility bridging is needed, keep it narrow and reversible

Definition of done:
- jobs are created through the Local Vault API
- jobs are stored durably in SQLite
- job status updates go through the Local Vault API
- retry queue survives browser clearing and browser restarts as long as the local database remains intact
- current app still builds and runs
- current AI indexing/retry behavior remains functional
- IndexedDB is no longer the intended primary jobs queue store

Required verification:
- run lint, typecheck, build, and relevant tests
- add or update tests for:
  - job creation through Local Vault API
  - job status update through Local Vault API
  - retry queue persistence
  - behavior when Local Vault API is unavailable
  - compatibility with current record index_status updates
- document any temporary fallback behavior

Important guardrails:
- Treat this as jobs queue migration only
- Do not broaden scope into full backup/restore redesign
- Do not broaden scope into full IndexedDB removal
- Do not redesign semantic search architecture
- Do not change Pi/Chroma contract

After completion, stop and summarize:
- files changed
- what still depends on IndexedDB
- whether jobs are now primarily SQLite-backed
- whether retry durability now survives browser clearing
- what should be migrated next