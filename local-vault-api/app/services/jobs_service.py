from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime

from fastapi import HTTPException

from app.models import JobItem, JobUpsertRequest


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _row_to_job(row: sqlite3.Row) -> JobItem:
    return JobItem(
        id=row["id"],
        type=row["type"],
        status=row["status"],
        payload=json.loads(row["payload_json"]),
        retry_count=row["retry_count"],
        last_attempt=row["last_attempt"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_jobs(connection: sqlite3.Connection) -> list[JobItem]:
    rows = connection.execute(
        """
        SELECT id, type, status, payload_json, retry_count, last_attempt, created_at, updated_at
        FROM jobs
        ORDER BY updated_at DESC
        """
    ).fetchall()
    return [_row_to_job(row) for row in rows]


def get_job(connection: sqlite3.Connection, job_id: str) -> JobItem:
    row = connection.execute(
        """
        SELECT id, type, status, payload_json, retry_count, last_attempt, created_at, updated_at
        FROM jobs
        WHERE id = ?
        """,
        (job_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    return _row_to_job(row)


def upsert_job(connection: sqlite3.Connection, payload: JobUpsertRequest) -> JobItem:
    existing = connection.execute("SELECT created_at FROM jobs WHERE id = ?", (payload.id,)).fetchone()
    created_at = existing["created_at"] if existing else now_iso()
    updated_at = now_iso()

    connection.execute(
        """
        INSERT INTO jobs (
            id, type, status, payload_json, retry_count, last_attempt, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            status = excluded.status,
            payload_json = excluded.payload_json,
            retry_count = excluded.retry_count,
            last_attempt = excluded.last_attempt,
            updated_at = excluded.updated_at
        """,
        (
            payload.id,
            payload.type,
            payload.status,
            payload.payload.model_dump_json(),
            payload.retry_count,
            payload.last_attempt,
            created_at,
            updated_at,
        ),
    )
    return get_job(connection, payload.id)


def delete_job(connection: sqlite3.Connection, job_id: str) -> None:
    result = connection.execute("DELETE FROM jobs WHERE id = ?", (job_id,))

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found.")
