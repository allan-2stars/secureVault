# SQLite Target Schema

This document defines the first-pass durable schema for the Local Vault API.

Goals:
- preserve the current product data model
- keep secret fields encrypted before they are persisted
- stay compatible with the existing AI index contract
- avoid overfitting the schema to IndexedDB

## Tables

### schema_migrations

- `version` TEXT PRIMARY KEY
- `applied_at` TEXT NOT NULL

Used to track idempotent schema setup for later migration steps.

### vault_settings

- `key` TEXT PRIMARY KEY
- `value_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Stores small configuration values such as:
- vault initialization flags
- encryption version
- app mode
- local API configuration

### records

- `id` TEXT PRIMARY KEY
- `type` TEXT NOT NULL
- `title` TEXT NOT NULL
- `account_hint` TEXT NOT NULL
- `account_encrypted` TEXT NOT NULL
- `password_encrypted` TEXT NOT NULL
- `url` TEXT NOT NULL
- `notes_summary` TEXT NOT NULL
- `private_notes_encrypted` TEXT NOT NULL
- `tags_json` TEXT NOT NULL
- `category` TEXT NOT NULL
- `ai_index_text` TEXT NOT NULL
- `index_status` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Rules:
- encrypted secret fields remain encrypted at rest
- `ai_index_text` contains only safe derived text
- `index_status` is constrained to `pending` or `synced`

### jobs

- `id` TEXT PRIMARY KEY
- `type` TEXT NOT NULL
- `status` TEXT NOT NULL
- `payload_json` TEXT NOT NULL
- `retry_count` INTEGER NOT NULL DEFAULT 0
- `last_attempt` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Used for durable retry work such as AI index upsert/delete jobs.

## Indexes

- `idx_records_updated_at` on `records(updated_at DESC)`
- `idx_records_category` on `records(category)`
- `idx_records_index_status` on `records(index_status)`
- `idx_jobs_status` on `jobs(status)`
- `idx_jobs_type` on `jobs(type)`

## Notes

- No secrets are sent to Pi, Chroma, or AI paths.
- The Local Vault API becomes the future durable storage boundary.
- The frontend can continue using IndexedDB during the staged migration.
