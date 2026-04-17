
Proceed to SQLite Migration Phase 5: migrate frontend record create, update, and delete operations to the Local Vault API.

Current status:
- SQLite migration Phase 1 is complete
- SQLite migration Phase 2 is complete
- Local Vault API supports CRUD for settings, jobs, and records
- frontend settings cutover has begun
- frontend record listing and record reads have been migrated or are in progress through the Local Vault API
- Pi/Chroma integration remains unchanged and working
- IndexedDB is still present as a transitional storage layer

Goal of this phase:
- move the frontend record write path to the Local Vault API
- make SQLite the primary durable backend for record creation, update, and deletion
- preserve current UI behavior as much as possible
- keep migration incremental and reversible if needed

Constraints:
- Do NOT remove IndexedDB yet unless it is only safe to downgrade specific write-path responsibilities
- Do NOT redesign Pi/Chroma integration
- Do NOT change the data exposure policy
- Do NOT add sync, login, payment, admin, or mobile support
- Do NOT over-refactor the UI
- Do NOT change semantic search architecture in this phase except for minimal compatibility work
- Do NOT redesign backup/restore in this phase except for minimal compatibility work

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
1. Extend the frontend storage adapter/repository layer to support record create, update, and delete through the Local Vault API
2. Make the Local Vault API the primary write target for records
3. Preserve encrypted field handling rules and secret-at-rest behavior
4. Keep request/response shapes close to the current frontend record model
5. Keep IndexedDB available only as transitional support where strictly necessary
6. Ensure delete behavior remains compatible with current UI expectations
7. Keep Pi/Chroma contract unchanged; if write-path changes require reindex triggers, handle them in the smallest safe way

Implementation guidance:
- prefer the smallest possible change set
- keep repository/storage boundaries clean
- do not let the UI depend directly on IndexedDB-specific write logic
- preserve masking/reveal assumptions as much as possible
- keep error handling explicit for Local Vault API failures
- if a transitional dual-write or temporary compatibility step is required, keep it tightly scoped and documented
- avoid introducing long-term duplication

Definition of done:
- frontend can create records through the Local Vault API
- frontend can update records through the Local Vault API
- frontend can delete records through the Local Vault API
- created/updated/deleted records are persisted durably in SQLite
- current app still builds and runs
- current UI behavior remains substantially unchanged
- IndexedDB is not yet fully removed, but is no longer the intended primary record write path
- Pi/Chroma integration remains untouched at the contract level

Required verification:
- run lint, typecheck, build, and relevant tests
- add or update tests for:
  - record create through Local Vault API
  - record update through Local Vault API
  - record delete through Local Vault API
  - failure handling if the Local Vault API is unavailable
  - compatibility with existing list/read flows
- document any temporary transition behavior

Important guardrails:
- Do not attempt to remove all IndexedDB usage in this phase
- Do not migrate jobs queue in this phase unless a very small compatibility change is required
- Do not redesign semantic search flow; only make the minimal write-path compatibility adjustments needed
- Do not redesign backup/restore beyond what is required for the new primary write path

After completion, stop and summarize:
- files changed
- repository/adapter changes
- what still depends on IndexedDB
- whether record writes are now primarily SQLite-backed
- what should be migrated next (likely jobs queue and IndexedDB reduction)