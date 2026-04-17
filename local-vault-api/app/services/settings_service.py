from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime

from fastapi import HTTPException

from app.models import SettingItem, SettingUpsertRequest


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def list_settings(connection: sqlite3.Connection) -> list[SettingItem]:
    rows = connection.execute(
        """
        SELECT key, value_json, updated_at
        FROM vault_settings
        ORDER BY key ASC
        """
    ).fetchall()

    return [
        SettingItem(key=row["key"], value=json.loads(row["value_json"]), updated_at=row["updated_at"])
        for row in rows
    ]


def get_setting(connection: sqlite3.Connection, key: str) -> SettingItem:
    row = connection.execute(
        """
        SELECT key, value_json, updated_at
        FROM vault_settings
        WHERE key = ?
        """,
        (key,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Setting not found.")

    return SettingItem(key=row["key"], value=json.loads(row["value_json"]), updated_at=row["updated_at"])


def upsert_setting(connection: sqlite3.Connection, payload: SettingUpsertRequest) -> SettingItem:
    updated_at = now_iso()
    connection.execute(
        """
        INSERT INTO vault_settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
        """,
        (payload.key, json.dumps(payload.value), updated_at),
    )
    return get_setting(connection, payload.key)


def delete_setting(connection: sqlite3.Connection, key: str) -> None:
    result = connection.execute(
        """
        DELETE FROM vault_settings
        WHERE key = ?
        """,
        (key,),
    )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Setting not found.")
