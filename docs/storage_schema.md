# Storage Schema

## IndexedDB Stores

### vault_settings
- vault_initialized: boolean
- password_salt: string
- encryption_version: string
- app_mode: "privacy"

---

### records
- id: uuid
- type: string
- title: string
- account_hint: string
- account_encrypted: string
- password_encrypted: string
- url: string
- notes_summary: string
- private_notes_encrypted: string
- tags: string[]
- category: string
- created_at: timestamp
- updated_at: timestamp
- index_status: "synced" | "pending"

---

### jobs
- id
- type: "index_upsert" | "index_delete"
- payload
- status
- retry_count
- last_attempt