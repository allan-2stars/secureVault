from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn


def main() -> None:
    api_root = Path(__file__).resolve().parent
    sys.path.insert(0, str(api_root))

    host = os.getenv("LOCAL_VAULT_API_HOST", "127.0.0.1")
    port = int(os.getenv("LOCAL_VAULT_API_PORT", "9100"))

    uvicorn.run("app.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
