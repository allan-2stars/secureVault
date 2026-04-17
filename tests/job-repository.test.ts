import test from "node:test";
import assert from "node:assert/strict";

import type { VaultJob } from "@/lib/storage/indexeddb";
import type { LocalVaultApiJob } from "@/lib/vault/local-vault-api";
import {
  listVaultJobsWithClients,
  mapLocalVaultApiJobToVaultJob,
  saveVaultJobWithClients
} from "@/lib/vault/job-repository";

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

test("job creation goes through the Local Vault API before the IndexedDB mirror", async () => {
  const writeOrder: string[] = [];

  const saved = await saveVaultJobWithClients(createVaultJob(), {
    putIndexedDbJob: async (job) => {
      writeOrder.push(`indexeddb:${job.status}`);
    },
    upsertApiJob: async (job) => {
      writeOrder.push(`api:${job.status}`);
      return createApiJob({
        ...job,
        status: "pending"
      });
    }
  });

  assert.equal(saved.status, "pending");
  assert.deepEqual(writeOrder, ["api:pending", "indexeddb:pending"]);
});

test("job status update uses the Local Vault API response as the mirrored IndexedDB payload", async () => {
  let mirroredStatus: VaultJob["status"] | null = null;

  await saveVaultJobWithClients(createVaultJob({
    status: "running"
  }), {
    putIndexedDbJob: async (job) => {
      mirroredStatus = job.status;
    },
    upsertApiJob: async (job) =>
      createApiJob({
        ...job,
        status: "failed",
        retry_count: 2
      })
  });

  assert.equal(mirroredStatus, "failed");
});

test("job list prefers Local Vault API persistence so retry jobs survive browser clearing", async () => {
  const jobs = await listVaultJobsWithClients({
    listIndexedDbJobs: async () => [],
    listApiJobs: async () => [
      createApiJob({
        status: "failed",
        retry_count: 3
      })
    ]
  });

  assert.deepEqual(jobs, [
    mapLocalVaultApiJobToVaultJob(createApiJob({
      status: "failed",
      retry_count: 3
    }))
  ]);
});

test("job repository falls back to IndexedDB when the Local Vault API is unavailable", async () => {
  const jobs = await listVaultJobsWithClients({
    listIndexedDbJobs: async () => [createVaultJob({
      status: "failed",
      retry_count: 1
    })],
    listApiJobs: async () => {
      throw new Error("Local Vault API unavailable");
    }
  });

  assert.equal(jobs[0]?.status, "failed");
});

test("job repository keeps a local IndexedDB queue copy if Local Vault API write fails", async () => {
  let mirrored = false;

  const saved = await saveVaultJobWithClients(createVaultJob({
    status: "pending"
  }), {
    putIndexedDbJob: async () => {
      mirrored = true;
    },
    upsertApiJob: async () => {
      throw new Error("Local Vault API unavailable");
    }
  });

  assert.equal(saved.status, "pending");
  assert.equal(mirrored, true);
});
