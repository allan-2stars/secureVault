import test from "node:test";
import assert from "node:assert/strict";

import type { VaultJob, VaultRecord, VaultSettingKey } from "@/lib/vault/types";
import {
  createVaultSnapshotWithClients,
  replaceVaultSnapshotWithClients,
  type VaultSnapshot
} from "@/lib/vault/backup-repository";

function createRecord(overrides: Partial<VaultRecord> = {}): VaultRecord {
  return {
    id: "rec-1",
    type: "login",
    title: "PlayStation",
    account_hint: "p***@mail.com",
    account_encrypted: '{"ciphertext":"a","iv":"b"}',
    password_encrypted: '{"ciphertext":"c","iv":"d"}',
    url: "https://playstation.com",
    notes_summary: "gaming purchases",
    private_notes_encrypted: '{"ciphertext":"e","iv":"f"}',
    tags: ["gaming"],
    category: "gaming",
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    index_status: "pending",
    ...overrides
  };
}

function createJob(overrides: Partial<VaultJob> = {}): VaultJob {
  return {
    id: "index_upsert:rec-1",
    type: "index_upsert",
    payload: {
      record_id: "rec-1",
      ai_index_text: "gaming account subscriptions"
    },
    status: "pending",
    retry_count: 0,
    last_attempt: null,
    ...overrides
  };
}

test("backup export uses SQLite-backed repositories as the source of truth", async () => {
  const snapshot = await createVaultSnapshotWithClients({
    listJobs: async () => [createJob()],
    listRecords: async () => [createRecord()],
    listSettings: async () => ({
      vault_initialized: true,
      ai_api_base_url: "http://192.168.50.205:9000"
    })
  });

  assert.equal(snapshot.records.length, 1);
  assert.equal(snapshot.jobs.length, 1);
  assert.equal(snapshot.settings.length, 2);
});

test("restore import writes snapshot contents back through the durable repositories", async () => {
  const operations: string[] = [];
  const snapshot: VaultSnapshot = {
    format: "securevault-backup-v1",
    exported_at: "2026-04-17T00:00:00.000Z",
    settings: [
      { key: "vault_initialized", value: true },
      { key: "ai_api_base_url", value: "http://192.168.50.205:9000" }
    ],
    records: [createRecord()],
    jobs: [createJob()]
  };

  await replaceVaultSnapshotWithClients(snapshot, {
    deleteJob: async (id) => {
      operations.push(`delete-job:${id}`);
    },
    deleteRecord: async (id) => {
      operations.push(`delete-record:${id}`);
    },
    deleteSetting: async (key) => {
      operations.push(`delete-setting:${key}`);
    },
    listJobs: async () => [createJob({
      id: "old-job"
    })],
    listRecords: async () => [createRecord({
      id: "old-record"
    })],
    listSettings: async () => ({
      vault_initialized: true,
      app_mode: "privacy"
    }),
    saveJob: async (job) => {
      operations.push(`save-job:${job.id}`);
      return job;
    },
    saveRecord: async (record) => {
      operations.push(`save-record:${record.id}`);
      return record;
    },
    saveSetting: async (key, value) => {
      operations.push(`save-setting:${key}:${String(value)}`);
    }
  });

  assert.deepEqual(operations, [
    "delete-job:old-job",
    "delete-record:old-record",
    "delete-setting:vault_initialized",
    "delete-setting:app_mode",
    "save-setting:vault_initialized:true",
    "save-setting:ai_api_base_url:http://192.168.50.205:9000",
    "save-record:rec-1",
    "save-job:index_upsert:rec-1"
  ]);
});
