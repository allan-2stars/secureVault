Proceed to Phase 8: Post-SQLite Cleanup and Packaging Readiness.

Current status:
- SQLite migration is effectively complete
- Local Vault API + SQLite is the durable source of truth
- record reads/writes are SQLite-backed
- jobs queue is SQLite-backed
- vault initialization and unlock are tied to SQLite
- backup/export reads from SQLite / Local Vault API
- restore/import writes back into SQLite / Local Vault API
- Pi/Chroma integration remains unchanged and working
- IndexedDB, if still present, should now be treated as non-primary transitional browser storage only

Goal of this phase:
- clean up transitional storage code and migration leftovers
- make architecture boundaries explicit
- reduce technical debt from the IndexedDB → SQLite migration
- prepare the project for future desktop packaging and hybrid product evolution
- preserve all working product functionality

Constraints:
- Do NOT redesign Pi/Chroma integration
- Do NOT change the data exposure policy
- Do NOT add sync, login, payment, admin, or mobile support
- Do NOT redesign semantic search architecture
- Do NOT introduce new product features
- Do NOT over-refactor UI behavior
- Do NOT break the current working app

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
1. Remove or reduce obsolete IndexedDB-primary assumptions in the frontend
2. Clean up transitional storage adapters and clearly document what remains browser-only
3. Make Local Vault API + SQLite the explicit durable boundary everywhere in the codebase
4. Remove dead code, obsolete fallbacks, and outdated migration scaffolding where safe
5. Keep IndexedDB only if still useful for tightly-scoped transient roles:
   - session UI state
   - temporary drafts
   - short-lived cache
6. Clarify environment/config structure for future local packaging
7. Ensure backup/restore, unlock flow, record CRUD, jobs queue, and semantic search still work after cleanup
8. Add documentation or architecture notes for future desktop packaging readiness

Packaging readiness guidance:
- Do not implement packaging yet
- Prepare the codebase so desktop packaging later will be straightforward
- Prefer clear separation between:
  - frontend UI
  - Local Vault API
  - SQLite durable storage
  - Pi/Chroma semantic search service
- Make local runtime assumptions explicit in config and docs

Implementation guidance:
- prefer the smallest safe cleanup that improves architecture clarity
- remove only code that is clearly obsolete after the SQLite migration
- preserve current working behavior
- document any remaining IndexedDB usage explicitly
- avoid introducing new abstraction layers unless they reduce real migration debt
- do not broaden into a sync-mode or desktop implementation phase yet

Definition of done:
- Local Vault API + SQLite is clearly the durable source of truth everywhere relevant
- obsolete IndexedDB-primary logic is removed or minimized
- remaining IndexedDB usage, if any, is explicitly limited to transient browser roles
- project still builds and runs
- tests still pass
- architecture is cleaner and easier to package later
- docs clearly describe current runtime boundaries and next packaging step

Required verification:
- run lint, typecheck, build, and relevant tests
- verify:
  - unlock flow still works
  - record CRUD still works
  - jobs queue still works
  - semantic search still works
  - backup/export and restore/import still work
  - browser clearing does not remove durable vault data
- update docs to reflect the post-migration architecture

After completion, stop and summarize:
- files changed
- what IndexedDB still does, if anything
- what obsolete code was removed
- whether the project is now ready for a future desktop packaging phase
- what the recommended next step should be
  
Do not remove any remaining IndexedDB usage unless it is clearly non-essential or safely replaceable in this phase.Prompt_SQLite_phase8