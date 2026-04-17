from __future__ import annotations

import sqlite3

from fastapi import HTTPException

from app.models import RecordItem, RecordUpsertRequest


def _row_to_record(row: sqlite3.Row) -> RecordItem:
    return RecordItem(
        id=row["id"],
        type=row["type"],
        title=row["title"],
        account_hint=row["account_hint"],
        account_encrypted=row["account_encrypted"],
        password_encrypted=row["password_encrypted"],
        url=row["url"],
        notes_summary=row["notes_summary"],
        private_notes_encrypted=row["private_notes_encrypted"],
        tags_json=row["tags_json"],
        category=row["category"],
        ai_index_text=row["ai_index_text"],
        index_status=row["index_status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_records(connection: sqlite3.Connection) -> list[RecordItem]:
    rows = connection.execute(
        """
        SELECT
            id, type, title, account_hint, account_encrypted, password_encrypted, url,
            notes_summary, private_notes_encrypted, tags_json, category, ai_index_text,
            index_status, created_at, updated_at
        FROM records
        ORDER BY updated_at DESC
        """
    ).fetchall()
    return [_row_to_record(row) for row in rows]


def get_record(connection: sqlite3.Connection, record_id: str) -> RecordItem:
    row = connection.execute(
        """
        SELECT
            id, type, title, account_hint, account_encrypted, password_encrypted, url,
            notes_summary, private_notes_encrypted, tags_json, category, ai_index_text,
            index_status, created_at, updated_at
        FROM records
        WHERE id = ?
        """,
        (record_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Record not found.")

    return _row_to_record(row)


def upsert_record(connection: sqlite3.Connection, payload: RecordUpsertRequest) -> RecordItem:
    connection.execute(
        """
        INSERT INTO records (
            id, type, title, account_hint, account_encrypted, password_encrypted, url,
            notes_summary, private_notes_encrypted, tags_json, category, ai_index_text,
            index_status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            title = excluded.title,
            account_hint = excluded.account_hint,
            account_encrypted = excluded.account_encrypted,
            password_encrypted = excluded.password_encrypted,
            url = excluded.url,
            notes_summary = excluded.notes_summary,
            private_notes_encrypted = excluded.private_notes_encrypted,
            tags_json = excluded.tags_json,
            category = excluded.category,
            ai_index_text = excluded.ai_index_text,
            index_status = excluded.index_status,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        """,
        (
            payload.id,
            payload.type,
            payload.title,
            payload.account_hint,
            payload.account_encrypted,
            payload.password_encrypted,
            payload.url,
            payload.notes_summary,
            payload.private_notes_encrypted,
            payload.tags_json,
            payload.category,
            payload.ai_index_text,
            payload.index_status,
            payload.created_at,
            payload.updated_at,
        ),
    )
    return get_record(connection, payload.id)


def delete_record(connection: sqlite3.Connection, record_id: str) -> None:
    result = connection.execute("DELETE FROM records WHERE id = ?", (record_id,))

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found.")
