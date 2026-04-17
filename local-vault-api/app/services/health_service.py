from __future__ import annotations

from app.db import get_connection
from app.schema import get_schema_status, initialize_schema


def get_health_payload() -> dict:
    with get_connection() as connection:
        initialize_schema(connection)
        status = get_schema_status(connection)

    return {
        "status": "ok" if status.db_ok else "error",
        "db_ok": status.db_ok,
        "foreign_keys_enabled": status.foreign_keys_enabled,
        "schema_version": status.schema_version,
    }
