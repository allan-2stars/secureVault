from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path


class DatabaseInitializationTest(unittest.TestCase):
    def test_schema_is_created_idempotently(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "securevault-test.db"
            connection = sqlite3.connect(db_path)
            connection.execute("PRAGMA foreign_keys = ON;")

            schema_statements = (
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
            )

            for _ in range(2):
                for statement in schema_statements:
                    connection.execute(statement)

            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table';"
                ).fetchall()
            }

            self.assertIn("schema_migrations", tables)
            self.assertIn("vault_settings", tables)
            self.assertIn("records", tables)
            self.assertIn("jobs", tables)
            self.assertEqual(connection.execute("PRAGMA foreign_keys;").fetchone()[0], 1)

            connection.close()


if __name__ == "__main__":
    unittest.main()
