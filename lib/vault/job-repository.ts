import {
  deleteLocalVaultApiJob,
  isLocalVaultApiConfigured,
  listLocalVaultApiJobs,
  type LocalVaultApiJob,
  upsertLocalVaultApiJob
} from "@/lib/vault/local-vault-api";
import { type VaultJob } from "@/lib/vault/types";

function sortJobsForProcessing(jobs: VaultJob[]): VaultJob[] {
  return [...jobs].sort((left, right) => left.retry_count - right.retry_count);
}

export function mapLocalVaultApiJobToVaultJob(job: LocalVaultApiJob): VaultJob {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    payload: {
      record_id: job.payload.record_id,
      ai_index_text: job.payload.ai_index_text ?? undefined,
      category: job.payload.category ?? undefined,
      tags: job.payload.tags ?? undefined,
      type: job.payload.type ?? undefined
    },
    retry_count: job.retry_count,
    last_attempt: job.last_attempt
  };
}

export type JobReadClients = {
  listApiJobs: () => Promise<LocalVaultApiJob[]>;
};

export type JobWriteClients = {
  deleteApiJob: (id: string) => Promise<void>;
  upsertApiJob: (job: VaultJob) => Promise<LocalVaultApiJob>;
};

export async function listVaultJobsWithClients(clients: JobReadClients): Promise<VaultJob[]> {
  return sortJobsForProcessing((await clients.listApiJobs()).map(mapLocalVaultApiJobToVaultJob));
}

export async function listVaultJobs(): Promise<VaultJob[]> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before loading vault jobs.");
  }

  return listVaultJobsWithClients({
    listApiJobs: listLocalVaultApiJobs
  });
}

export async function saveVaultJobWithClients(
  job: VaultJob,
  clients: Pick<JobWriteClients, "upsertApiJob">
): Promise<VaultJob> {
  return mapLocalVaultApiJobToVaultJob(await clients.upsertApiJob(job));
}

export async function deleteVaultJobWithClients(
  id: string,
  clients: Pick<JobWriteClients, "deleteApiJob">
): Promise<void> {
  await clients.deleteApiJob(id);
}

export async function saveVaultJob(job: VaultJob): Promise<VaultJob> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before saving vault jobs.");
  }

  return saveVaultJobWithClients(job, {
    upsertApiJob: async (nextJob) =>
      upsertLocalVaultApiJob({
        id: nextJob.id,
        type: nextJob.type,
        status: nextJob.status,
        payload: nextJob.payload,
        retry_count: nextJob.retry_count,
        last_attempt: nextJob.last_attempt
      })
  });
}

export async function deleteVaultJob(id: string): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before deleting vault jobs.");
  }

  return deleteVaultJobWithClients(id, {
    deleteApiJob: deleteLocalVaultApiJob
  });
}
