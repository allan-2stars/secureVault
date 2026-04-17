import {
  deleteJob,
  getAllJobs,
  putJob,
  type VaultJob
} from "@/lib/storage/indexeddb";
import {
  deleteLocalVaultApiJob,
  isLocalVaultApiConfigured,
  listLocalVaultApiJobs,
  type LocalVaultApiJob,
  upsertLocalVaultApiJob
} from "@/lib/vault/local-vault-api";

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
  listIndexedDbJobs: () => Promise<VaultJob[]>;
  listApiJobs?: () => Promise<LocalVaultApiJob[]>;
};

export type JobWriteClients = {
  deleteIndexedDbJob: (id: string) => Promise<void>;
  putIndexedDbJob: (job: VaultJob) => Promise<void>;
  deleteApiJob?: (id: string) => Promise<void>;
  upsertApiJob?: (job: VaultJob) => Promise<LocalVaultApiJob>;
};

export async function listVaultJobsWithClients(clients: JobReadClients): Promise<VaultJob[]> {
  if (!clients.listApiJobs) {
    return sortJobsForProcessing(await clients.listIndexedDbJobs());
  }

  try {
    return sortJobsForProcessing((await clients.listApiJobs()).map(mapLocalVaultApiJobToVaultJob));
  } catch {
    return sortJobsForProcessing(await clients.listIndexedDbJobs());
  }
}

export async function listVaultJobs(): Promise<VaultJob[]> {
  return listVaultJobsWithClients({
    listIndexedDbJobs: getAllJobs,
    listApiJobs: isLocalVaultApiConfigured() ? listLocalVaultApiJobs : undefined
  });
}

export async function saveVaultJobWithClients(
  job: VaultJob,
  clients: Pick<JobWriteClients, "putIndexedDbJob" | "upsertApiJob">
): Promise<VaultJob> {
  if (!clients.upsertApiJob) {
    await clients.putIndexedDbJob(job);
    return job;
  }

  try {
    const savedJob = mapLocalVaultApiJobToVaultJob(await clients.upsertApiJob(job));
    await clients.putIndexedDbJob(savedJob);
    return savedJob;
  } catch {
    await clients.putIndexedDbJob(job);
    return job;
  }
}

export async function deleteVaultJobWithClients(
  id: string,
  clients: Pick<JobWriteClients, "deleteApiJob" | "deleteIndexedDbJob">
): Promise<void> {
  if (clients.deleteApiJob) {
    try {
      await clients.deleteApiJob(id);
    } catch {
      await clients.deleteIndexedDbJob(id);
      return;
    }
  }

  await clients.deleteIndexedDbJob(id);
}

export async function saveVaultJob(job: VaultJob): Promise<VaultJob> {
  return saveVaultJobWithClients(job, {
    putIndexedDbJob: putJob,
    upsertApiJob: isLocalVaultApiConfigured()
      ? async (nextJob) =>
          upsertLocalVaultApiJob({
            id: nextJob.id,
            type: nextJob.type,
            status: nextJob.status,
            payload: nextJob.payload,
            retry_count: nextJob.retry_count,
            last_attempt: nextJob.last_attempt
          })
      : undefined
  });
}

export async function deleteVaultJob(id: string): Promise<void> {
  return deleteVaultJobWithClients(id, {
    deleteApiJob: isLocalVaultApiConfigured() ? deleteLocalVaultApiJob : undefined,
    deleteIndexedDbJob: deleteJob
  });
}
