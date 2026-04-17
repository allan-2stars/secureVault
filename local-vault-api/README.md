# Local Vault API

Phase 1 scaffold for the SQLite migration of SecureVault AI.

This service is intended to become the future durable local storage boundary for the app while keeping:
- secret fields encrypted before persistence
- Pi/Chroma contracts unchanged
- the current frontend stable during migration

## Planned responsibilities

- initialize and verify the local SQLite database
- expose health and readiness information
- later host durable CRUD endpoints for records, settings, and retry jobs

## Run later

```bash
LOCAL_VAULT_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
uvicorn app.main:app --host 127.0.0.1 --port 9100
```

If your frontend runs on a different origin, add that exact origin to `LOCAL_VAULT_ALLOW_ORIGINS`.

## Smoke check

```bash
python3 tests/test_db_init.py
```
