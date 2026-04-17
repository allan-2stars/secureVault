from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import settings


def ensure_db_directory() -> Path:
    db_path = settings.db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def connect() -> sqlite3.Connection:
    db_path = ensure_db_directory()
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = connect()

    try:
      yield connection
      connection.commit()
    except Exception:
      connection.rollback()
      raise
    finally:
      connection.close()
