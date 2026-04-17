from __future__ import annotations

import sqlite3
from dataclasses import dataclass


SCHEMA_VERSION = "phase1-initial"


@dataclass(frozen=True)
class SchemaStatus:
    db_ok: bool
    foreign_keys_enabled: bool
    schema_version: str


SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS vault_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        account_hint TEXT NOT NULL,
        account_encrypted TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        url TEXT NOT NULL,
        notes_summary TEXT NOT NULL,
        private_notes_encrypted TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        category TEXT NOT NULL,
        ai_index_text TEXT NOT NULL,
        index_status TEXT NOT NULL CHECK (index_status IN ('pending', 'synced')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'failed')),
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_attempt TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_records_updated_at
    ON records(updated_at DESC);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_records_category
    ON records(category);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_records_index_status
    ON records(index_status);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON jobs(status);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_jobs_type
    ON jobs(type);
    """,
)


def initialize_schema(connection: sqlite3.Connection) -> None:
    for statement in SCHEMA_STATEMENTS:
        connection.execute(statement)

    connection.execute(
        """
        INSERT OR IGNORE INTO schema_migrations (version, applied_at)
        VALUES (?, datetime('now'));
        """,
        (SCHEMA_VERSION,),
    )


def get_schema_status(connection: sqlite3.Connection) -> SchemaStatus:
    foreign_keys_enabled = bool(connection.execute("PRAGMA foreign_keys;").fetchone()[0])

    return SchemaStatus(
        db_ok=True,
        foreign_keys_enabled=foreign_keys_enabled,
        schema_version=SCHEMA_VERSION,
    )
