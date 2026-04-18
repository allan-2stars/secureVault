import test from "node:test";
import assert from "node:assert/strict";

import type { LocalVaultApiRecord } from "@/lib/vault/local-vault-api";
import {
  mapLocalVaultApiRecordToVaultRecord,
  saveVaultRecordWithClients
} from "@/lib/vault/record-repository";
import type { VaultRecord } from "@/lib/vault/types";

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

test("record detail mapping keeps the durable API record shape aligned with the frontend model", async () => {
  assert.deepEqual(
    mapLocalVaultApiRecordToVaultRecord(
      createApiRecord({
        tags_json: '["gaming","family"]',
        title: "Nintendo"
      })
    ),
    createIndexedDbRecord({
      tags: ["gaming", "family"],
      title: "Nintendo"
    })
  );
});

test("record create writes through the Local Vault API durable boundary", async () => {
  const writeOrder: string[] = [];
  const sourceRecord = createIndexedDbRecord({
    title: "New Durable Record"
  });

  const savedRecord = await saveVaultRecordWithClients(sourceRecord, {
    upsertApiRecord: async (record) => {
      writeOrder.push(`api:${record.title}`);
      return record;
    }
  });

  assert.equal(savedRecord.title, "New Durable Record");
  assert.deepEqual(writeOrder, ["api:New Durable Record"]);
});

test("record update uses the Local Vault API response shape", async () => {
  const savedRecord = await saveVaultRecordWithClients(createIndexedDbRecord({
    title: "Old Name"
  }), {
    upsertApiRecord: async (record) => ({
      ...record,
      title: "Updated By API"
    })
  });

  assert.equal(savedRecord.title, "Updated By API");
});

test("record write stops and surfaces the error when the Local Vault API is unavailable", async () => {
  await assert.rejects(
    () =>
      saveVaultRecordWithClients(createIndexedDbRecord(), {
        upsertApiRecord: async () => {
          throw new Error("Local Vault API unavailable");
        }
      }),
    /Local Vault API unavailable/
  );
});
