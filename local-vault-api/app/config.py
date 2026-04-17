from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_host: str = os.getenv("LOCAL_VAULT_API_HOST", "127.0.0.1")
    app_port: int = int(os.getenv("LOCAL_VAULT_API_PORT", "9100"))
    app_env: str = os.getenv("LOCAL_VAULT_API_ENV", "development")
    db_path_raw: str = os.getenv(
        "LOCAL_VAULT_DB_PATH",
        str(Path(__file__).resolve().parents[1] / "data" / "securevault.db"),
    )

    @property
    def db_path(self) -> Path:
        return Path(self.db_path_raw).expanduser().resolve()


settings = Settings()
