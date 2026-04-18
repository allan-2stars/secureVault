# Local Vault API

Local Vault API is the durable local storage boundary for SecureVault AI.

Responsibilities:
- initialize and verify the local SQLite database
- expose health and readiness information
- host durable CRUD for settings, records, and retry jobs
- act as the durable backup / restore boundary

This boundary keeps:
- secret fields encrypted before persistence
- Pi/Chroma contracts unchanged
- frontend UI separated from direct database access

## Run locally

```bash
LOCAL_VAULT_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
uvicorn app.main:app --host 127.0.0.1 --port 9100
```

If your frontend runs on a different origin, add that exact origin to `LOCAL_VAULT_ALLOW_ORIGINS`.

Environment example:
- [local-vault-api/.env.example](/home/sighpega/dev/secureVault/local-vault-api/.env.example)

## Smoke check

```bash
python3 tests/test_db_init.py
```
