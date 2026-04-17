import test from "node:test";
import assert from "node:assert/strict";

import type { VaultRecord } from "@/lib/storage/indexeddb";
import type { LocalVaultApiRecord } from "@/lib/vault/local-vault-api";
import {
  getVaultRecordForReadWithClients,
  listVaultRecordsForReadWithClients,
  mapLocalVaultApiRecordToVaultRecord
} from "@/lib/vault/record-repository";

function createIndexedDbRecord(overrides: Partial<VaultRecord> = {}): VaultRecord {
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
    tags: ["gaming", "console"],
    category: "gaming",
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    index_status: "pending",
    ...overrides
  };
}

function createApiRecord(overrides: Partial<LocalVaultApiRecord> = {}): LocalVaultApiRecord {
  const baseRecord = createIndexedDbRecord();

  return {
    ...baseRecord,
    tags_json: JSON.stringify(baseRecord.tags),
    ai_index_text: "playstation gaming purchases console",
    ...overrides
  };
}

test("record list loading uses Local Vault API records when they are current", async () => {
  const records = await listVaultRecordsForReadWithClients({
    listIndexedDbRecords: async () => [
      createIndexedDbRecord({
        updated_at: "2026-04-17T00:00:00.000Z"
      })
    ],
    listApiRecords: async () => [
      createApiRecord({
        title: "PlayStation Primary",
        updated_at: "2026-04-17T01:00:00.000Z"
      })
    ]
  });

  assert.equal(records[0]?.title, "PlayStation Primary");
});

test("record detail read loads and maps a Local Vault API record", async () => {
  const record = await getVaultRecordForReadWithClients("rec-1", {
    getIndexedDbRecord: async () => null,
    getApiRecord: async () =>
      createApiRecord({
        tags_json: '["gaming","family"]',
        title: "Nintendo"
      })
  });

  assert.deepEqual(record, mapLocalVaultApiRecordToVaultRecord(createApiRecord({
    tags_json: '["gaming","family"]',
    title: "Nintendo"
  })));
});

test("record list falls back to IndexedDB when the Local Vault API is unavailable", async () => {
  const indexedDbRecord = createIndexedDbRecord({
    title: "Offline Local Copy"
  });

  const records = await listVaultRecordsForReadWithClients({
    listIndexedDbRecords: async () => [indexedDbRecord],
    listApiRecords: async () => {
      throw new Error("Network down");
    }
  });

  assert.equal(records[0]?.title, "Offline Local Copy");
});
