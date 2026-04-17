Proceed to the next architecture phase: migrate SecureVault AI from browser-primary IndexedDB storage to a local durable storage architecture using a Local Vault API + SQLite.

Current status:
- Milestone 6 is complete
- semantic AI search works
- Pi/Chroma integration works
- fallback behavior works
- backup/restore using JSON works
- IndexedDB is still the current MVP storage layer

Goal of this phase:
- prepare SecureVault AI for durable local persistence
- make SQLite the future source of truth
- preserve the existing UI and product behavior as much as possible
- avoid rewriting working features unnecessarily

Important architectural constraints:
- Do NOT redesign the Pi API or Chroma integration contract
- Do NOT change the data exposure policy
- Do NOT send secrets to Pi, Chroma, or any AI path
- Do NOT add cloud sync, login, payment, admin, or mobile support
- Do NOT rebuild the UI unnecessarily
- Treat this as a staged migration, not a rewrite

Read and follow:
- AGENTS.md
- docs/PRD_v1_1.md
- docs/architecture.md
- docs/data_exposure_policy.md
- docs/sqlite_target_schema.md
- docs/migration_plan_sqlite.md
- docs/acceptance_criteria.md
- docs/test_strategy.md

Implementation goal for this phase:
Build the foundation for SQLite migration, but do not attempt the entire migration in one step.

Focus only on Phase 1 of the migration:
1. Create a Local Vault API skeleton
2. Add SQLite initialization and schema setup
3. Implement durable storage tables from sqlite_target_schema.md
4. Add health endpoint and basic DB initialization checks
5. Keep existing IndexedDB flow working for now
6. Do not yet remove or break current browser storage
7. Keep migration low-risk and incremental

Recommended stack for Local Vault API:
- FastAPI
- SQLite
- modular service structure
- local-only operation

Expected deliverables in this phase:
- local-vault-api project scaffold
- SQLite connection module
- schema initialization logic
- PRAGMA foreign_keys enabled
- health endpoint
- basic smoke-tested database setup
- docs updated if needed

Do not implement full CRUD cutover yet unless it is clearly isolated and low-risk.
Do not begin frontend cutover yet.
Do not remove IndexedDB yet.

Definition of done for this phase:
- Local Vault API starts successfully
- SQLite database file is created locally
- Target schema initializes successfully
- health endpoint reports healthy DB state
- schema creation is idempotent
- tests or smoke checks verify DB initialization
- current web app remains functional

Preferred engineering approach:
- keep the current app stable
- introduce a clean local API foundation first
- prepare for later CRUD migration and search migration
- preserve future compatibility with desktop packaging and hybrid sync mode

After completing this phase, stop and summarize:
- files created
- schema initialized
- how frontend can connect later
- what should be done in the next migration step