
Proceed to SQLite Migration Phase 4: migrate frontend record listing and record reads to the Local Vault API.

Current status:
- SQLite migration Phase 1 is complete
- SQLite migration Phase 2 is complete
- Local Vault API supports CRUD for settings, jobs, and records
- SQLite migration Phase 3 has begun narrow frontend cutover with settings
- Pi/Chroma integration remains unchanged and working
- IndexedDB is still present in the frontend and should remain available during transition

Goal of this phase:
- move record listing and record reads to the Local Vault API
- keep the migration narrow and low-risk
- preserve current frontend behavior and UI as much as possible
- prepare for later write-path migration without breaking the current app

Constraints:
- Do NOT migrate record create/update/delete yet unless clearly required for a minimal supporting change
- Do NOT remove IndexedDB yet
- Do NOT redesign Pi/Chroma integration
- Do NOT change the data exposure policy
- Do NOT add sync, login, payment, admin, or mobile support
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
1. Extend the frontend storage adapter/repository layer to support record listing and record reads through the Local Vault API
2. Keep the implementation isolated and easy to roll back
3. Use the Local Vault API as the source for:
   - record list views
   - record detail reads
4. Keep IndexedDB available during the transition as fallback or compatibility layer if necessary
5. Preserve current display behavior, including masking/reveal workflows where possible
6. Do not change semantic search architecture yet
7. Do not change backup/restore architecture yet

Implementation guidance:
- prefer the smallest possible change set
- keep request/response mapping close to the current frontend record model
- introduce or refine clean repository interfaces so the frontend does not depend directly on IndexedDB internals
- make sure record list loading and single-record reads are testable
- preserve existing encrypted-field handling assumptions
- if full reveal still depends on IndexedDB or current local storage, do not force a full secret-path migration in this phase unless strictly necessary and clearly isolated

Definition of done:
- frontend can load record lists from the Local Vault API
- frontend can load individual record details from the Local Vault API
- current app still builds and runs
- current UI behavior remains substantially unchanged
- IndexedDB is not removed yet
- write paths are not fully migrated yet
- Pi/Chroma integration remains untouched

Required verification:
- run lint, typecheck, build, and relevant tests
- add or update tests for:
  - record list loading from Local Vault API
  - record detail read from Local Vault API
  - fallback behavior if the Local Vault API is unavailable
- document any temporary limitations or compatibility behaviors

After completion, stop and summarize:
- files changed
- adapter/repository changes
- how record writes should be migrated next
- what record functionality still depends on IndexedDB
  
Do not attempt a full record persistence cutover in this phase; this phase is read-path migration only.