import test from "node:test";
import assert from "node:assert/strict";

import type { VaultRecord } from "@/lib/storage/indexeddb";
import type { LocalVaultApiRecord } from "@/lib/vault/local-vault-api";
import {
  deleteVaultRecordWithClients,
  getVaultRecordForReadWithClients,
  listVaultRecordsForReadWithClients,
  mapLocalVaultApiRecordToVaultRecord,
  saveVaultRecordWithClients
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

test("record create writes through the Local Vault API before the IndexedDB mirror", async () => {
  const writeOrder: string[] = [];
  const sourceRecord = createIndexedDbRecord({
    title: "New Durable Record"
  });

  const savedRecord = await saveVaultRecordWithClients(sourceRecord, {
    putIndexedDbRecord: async (record) => {
      writeOrder.push(`indexeddb:${record.title}`);
    },
    upsertApiRecord: async (record) => {
      writeOrder.push(`api:${record.title}`);
      return record;
    }
  });

  assert.equal(savedRecord.title, "New Durable Record");
  assert.deepEqual(writeOrder, ["api:New Durable Record", "indexeddb:New Durable Record"]);
});

test("record update uses the Local Vault API response as the mirrored IndexedDB payload", async () => {
  let mirroredTitle = "";

  await saveVaultRecordWithClients(createIndexedDbRecord({
    title: "Old Name"
  }), {
    putIndexedDbRecord: async (record) => {
      mirroredTitle = record.title;
    },
    upsertApiRecord: async (record) => ({
      ...record,
      title: "Updated By API"
    })
  });

  assert.equal(mirroredTitle, "Updated By API");
});

test("record delete removes the SQLite record before clearing the IndexedDB mirror", async () => {
  const deleteOrder: string[] = [];

  await deleteVaultRecordWithClients("rec-1", {
    deleteApiRecord: async (id) => {
      deleteOrder.push(`api:${id}`);
    },
    deleteIndexedDbRecord: async (id) => {
      deleteOrder.push(`indexeddb:${id}`);
    }
  });

  assert.deepEqual(deleteOrder, ["api:rec-1", "indexeddb:rec-1"]);
});

test("record write stops and surfaces the error when the Local Vault API is unavailable", async () => {
  let mirrored = false;

  await assert.rejects(
    () =>
      saveVaultRecordWithClients(createIndexedDbRecord(), {
        putIndexedDbRecord: async () => {
          mirrored = true;
        },
        upsertApiRecord: async () => {
          throw new Error("Local Vault API unavailable");
        }
      }),
    /Local Vault API unavailable/
  );

  assert.equal(mirrored, false);
});
