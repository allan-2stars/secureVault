Build MVP v1 of a privacy-first, local-first secure vault web app.

Constraints:
- Next.js App Router + TypeScript
- IndexedDB for storage
- Web Crypto API (AES-GCM)
- No cloud sync, login, payment, or mobile
- AI search uses ONLY ai_index_text
- Integrate with Pi-hosted Chroma via API
- Must fallback to keyword search if Chroma fails
- Must support offline usage
- Must support backup/restore

Read:
- AGENTS.md
- docs/PRD_v1_1.md
- docs/data_exposure_policy.md
- docs/storage_schema.md
- docs/chroma_contract.md
- docs/plans.md
- docs/acceptance_criteria.md

Execution:
- Complete milestone by milestone
- Run lint, typecheck, build after each step
- Do not expose secrets in logs or API