from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import get_connection
from app.models import JobUpsertRequest, RecordUpsertRequest, SettingUpsertRequest
from app.schema import initialize_schema
from app.services.jobs_service import delete_job, get_job, list_jobs, upsert_job
from app.services.records_service import delete_record, get_record, list_records, upsert_record
from app.services.settings_service import delete_setting, get_setting, list_settings, upsert_setting


class LocalVaultCrudServiceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        os.environ["LOCAL_VAULT_DB_PATH"] = str(Path(cls.temp_dir.name) / "securevault-api-test.db")

        with get_connection() as connection:
            initialize_schema(connection)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_dir.cleanup()
        os.environ.pop("LOCAL_VAULT_DB_PATH", None)

    def setUp(self) -> None:
        with get_connection() as connection:
            connection.execute("DELETE FROM jobs")
            connection.execute("DELETE FROM records")
            connection.execute("DELETE FROM vault_settings")

    def test_settings_crud(self) -> None:
        with get_connection() as connection:
            created = upsert_setting(
                connection,
                SettingUpsertRequest(key="app_mode", value="privacy"),
            )
            self.assertEqual(created.key, "app_mode")
            self.assertEqual(created.value, "privacy")

            fetched = get_setting(connection, "app_mode")
            self.assertEqual(fetched.value, "privacy")

            listed = list_settings(connection)
            self.assertEqual(len(listed), 1)

            delete_setting(connection, "app_mode")
            self.assertEqual(len(list_settings(connection)), 0)

    def test_jobs_crud(self) -> None:
        payload = JobUpsertRequest(
            id="job-1",
            type="index_upsert",
            status="pending",
            payload={
                "record_id": "rec-1",
                "ai_index_text": "gaming account subscriptions",
                "category": "gaming",
                "tags": ["playstation"],
                "type": "login",
            },
            retry_count=0,
            last_attempt=None,
        )

        with get_connection() as connection:
            created = upsert_job(connection, payload)
            self.assertEqual(created.id, "job-1")

            fetched = get_job(connection, "job-1")
            self.assertEqual(fetched.payload.record_id, "rec-1")

            listed = list_jobs(connection)
            self.assertEqual(len(listed), 1)

            delete_job(connection, "job-1")
            self.assertEqual(len(list_jobs(connection)), 0)

    def test_records_crud(self) -> None:
        payload = RecordUpsertRequest(
            id="rec-1",
            type="login",
            title="PlayStation",
            account_hint="p***@mail.com",
            account_encrypted='{"ciphertext":"a","iv":"b"}',
            password_encrypted='{"ciphertext":"c","iv":"d"}',
            url="https://playstation.com",
            notes_summary="gaming purchases",
            private_notes_encrypted='{"ciphertext":"e","iv":"f"}',
            tags_json='["gaming","console"]',
            category="gaming",
            ai_index_text="playstation gaming purchases console",
            index_status="pending",
            created_at="2026-04-17T00:00:00+00:00",
            updated_at="2026-04-17T00:00:00+00:00",
        )

        with get_connection() as connection:
            created = upsert_record(connection, payload)
            self.assertEqual(created.id, "rec-1")

            fetched = get_record(connection, "rec-1")
            self.assertEqual(fetched.title, "PlayStation")

            listed = list_records(connection)
            self.assertEqual(len(listed), 1)

            delete_record(connection, "rec-1")
            self.assertEqual(len(list_records(connection)), 0)


if __name__ == "__main__":
    unittest.main()
