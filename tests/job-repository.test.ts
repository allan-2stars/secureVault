import test from "node:test";
import assert from "node:assert/strict";

import type { LocalVaultApiJob } from "@/lib/vault/local-vault-api";
import { mapLocalVaultApiJobToVaultJob, saveVaultJobWithClients } from "@/lib/vault/job-repository";
import type { VaultJob } from "@/lib/vault/types";

function createVaultJob(overrides: Partial<VaultJob> = {}): VaultJob {
  return {
    id: "index_upsert:rec-1",
    type: "index_upsert",
    payload: {
      record_id: "rec-1",
      ai_index_text: "gaming account subscriptions",
      category: "gaming",
      tags: ["playstation"],
      type: "login"
    },
    status: "pending",
    retry_count: 0,
    last_attempt: null,
    ...overrides
  };
}

function createApiJob(overrides: Partial<LocalVaultApiJob> = {}): LocalVaultApiJob {
  const job = createVaultJob();

  return {
    ...job,
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    ...overrides
  };
}

test("job creation goes through the Local Vault API durable boundary", async () => {
  const writeOrder: string[] = [];

  const saved = await saveVaultJobWithClients(createVaultJob(), {
    upsertApiJob: async (job) => {
      writeOrder.push(`api:${job.status}`);
      return createApiJob({
        ...job,
        status: "pending"
      });
    }
  });

  assert.equal(saved.status, "pending");
  assert.deepEqual(writeOrder, ["api:pending"]);
});

test("job status update uses the Local Vault API response shape", async () => {
  const savedJob = await saveVaultJobWithClients(createVaultJob({
    status: "running"
  }), {
    upsertApiJob: async (job) =>
      createApiJob({
        ...job,
        status: "failed",
        retry_count: 2
      })
  });

  assert.equal(savedJob.status, "failed");
});

test("job mapping keeps the durable API queue shape aligned with the frontend model", async () => {
  assert.deepEqual(
    mapLocalVaultApiJobToVaultJob(
      createApiJob({
        status: "failed",
        retry_count: 3
      })
    ),
    createVaultJob({
      status: "failed",
      retry_count: 3
    })
  );
});

test("job write stops and surfaces the error when the Local Vault API is unavailable", async () => {
  await assert.rejects(
    () =>
      saveVaultJobWithClients(createVaultJob({
        status: "pending"
      }), {
        upsertApiJob: async () => {
          throw new Error("Local Vault API unavailable");
        }
      }),
    /Local Vault API unavailable/
  );
});
