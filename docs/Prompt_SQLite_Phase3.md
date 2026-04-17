
Proceed to SQLite Migration Phase 3: implement a narrow frontend cutover from IndexedDB to the Local Vault API, starting with settings only.

Current status:
- SQLite migration Phase 1 is complete
- SQLite migration Phase 2 is complete
- Local Vault API now supports CRUD for settings, jobs, and records
- current frontend still uses IndexedDB as the active MVP storage path
- Pi/Chroma integration remains unchanged and working

Goal of this phase:
- prove the frontend can safely read/write through the Local Vault API
- keep the cutover very narrow and low-risk
- preserve the existing frontend behavior as much as possible
- avoid breaking the current app

Constraints:
- Do NOT remove IndexedDB yet
- Do NOT cut over records yet unless clearly isolated and explicitly feature-flagged
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
1. Add a frontend storage adapter/repository layer if needed
2. Implement settings read/write through the Local Vault API
3. Keep IndexedDB settings path available as fallback if necessary
4. Gate the Local Vault API settings path behind a clear feature flag or isolated adapter
5. Do not migrate records or jobs yet unless needed for a very small supporting change
6. Keep the rest of the app unchanged

Implementation guidance:
- prefer the smallest change set
- preserve current UI behavior
- keep settings request/response shapes aligned with the Local Vault API
- make future cutover of records easier by introducing clean storage abstraction now
- avoid deep IndexedDB coupling

Definition of done:
- frontend can load settings from the Local Vault API
- frontend can save settings to the Local Vault API
- current app still builds and runs
- IndexedDB is not removed yet
- the settings cutover is isolated and testable
- no changes are made to Pi/Chroma integration

After completion, stop and summarize:
- files changed
- adapter/storage abstraction introduced
- how record listing can be migrated next
- what remains on IndexedDB