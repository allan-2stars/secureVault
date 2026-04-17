
Proceed to SQLite Migration Phase 2: implement isolated Local Vault API CRUD endpoints on top of the completed SQLite foundation.

Current status:
- SQLite migration Phase 1 is complete
- Local Vault API scaffold exists
- SQLite schema initializes successfully
- health endpoint works
- current frontend still uses IndexedDB and remains unchanged
- Pi/Chroma integration remains unchanged

Goal of this phase:
- add low-risk, isolated CRUD endpoints in the Local Vault API
- keep request/response shapes close to the current frontend model
- prepare for later frontend cutover without breaking the current app

Constraints:
- Do NOT remove IndexedDB yet
- Do NOT cut over the frontend fully yet
- Do NOT redesign Pi/Chroma integration
- Do NOT change the data exposure policy
- Do NOT add sync, login, payment, admin, or mobile support
- Do NOT over-refactor the frontend

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
1. Implement Local Vault API CRUD for settings
2. Implement Local Vault API CRUD for jobs
3. Implement Local Vault API CRUD for records
4. Implement category support if clearly isolated and low-risk
5. Keep API contracts simple and close to the current frontend record model
6. Add tests for create/read/update/delete behavior
7. Keep current frontend fully working and unchanged by default

Implementation guidance:
- keep service and route layers modular
- use SQLite as the durable store
- preserve encrypted field handling rules
- keep secret fields encrypted at rest
- do not expose secrets in logs
- ensure schema usage remains idempotent and stable

Definition of done:
- Local Vault API supports CRUD for settings, jobs, and records
- tests cover basic CRUD behavior
- current frontend still builds and runs unchanged
- no frontend cutover is required yet
- Pi/Chroma contract remains untouched

After completion, stop and summarize:
- endpoints added
- request/response shapes
- how frontend can begin narrow cutover next
- what should be migrated in the following step