import { deleteAiIndex, upsertAiIndex } from "@/lib/vault/ai-client";
import { buildAiIndexText } from "@/lib/vault/ai-index";
import {
  deleteJob,
  getAllJobs,
  getRecord,
  putJob,
  putRecord,
  type VaultJob,
  type VaultRecord
} from "@/lib/storage/indexeddb";
import type { VaultRecordSummary } from "@/lib/vault/records";

function jobIdFor(type: VaultJob["type"], recordId: string): string {
  return `${type}:${recordId}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function persistJob(job: VaultJob) {
  await putJob(job);
}

async function markRecordIndexStatus(recordId: string, status: VaultRecord["index_status"]) {
  const record = await getRecord(recordId);

  if (!record) {
    return;
  }

  await putRecord({
    ...record,
    index_status: status
  });
}

export async function queueUpsertJob(record: VaultRecordSummary): Promise<void> {
  const ai_index_text = buildAiIndexText(record);

  await persistJob({
    id: jobIdFor("index_upsert", record.id),
    type: "index_upsert",
    payload: {
      record_id: record.id,
      ai_index_text,
      type: record.type,
      category: record.category,
      tags: record.tags
    },
    status: "pending",
    retry_count: 0,
    last_attempt: null
  });

  await markRecordIndexStatus(record.id, "pending");
}

export async function queueDeleteJob(recordId: string): Promise<void> {
  await persistJob({
    id: jobIdFor("index_delete", recordId),
    type: "index_delete",
    payload: {
      record_id: recordId
    },
    status: "pending",
    retry_count: 0,
    last_attempt: null
  });
}

async function runJob(job: VaultJob): Promise<void> {
  await persistJob({
    ...job,
    status: "running",
    last_attempt: nowIso()
  });

  if (job.type === "index_upsert") {
    const { ai_index_text, record_id, category, tags, type } = job.payload;

    if (!ai_index_text?.trim()) {
      throw new Error("AI index text is empty.");
    }

    await upsertAiIndex({
      record_id,
      ai_index_text,
      category,
      tags,
      type
    });

    await markRecordIndexStatus(record_id, "synced");
    await deleteJob(job.id);
    return;
  }

  await deleteAiIndex({
    record_id: job.payload.record_id
  });
  await deleteJob(job.id);
}

async function failJob(job: VaultJob): Promise<void> {
  await persistJob({
    ...job,
    status: "failed",
    retry_count: job.retry_count + 1,
    last_attempt: nowIso()
  });

  if (job.type === "index_upsert") {
    await markRecordIndexStatus(job.payload.record_id, "pending");
  }
}

export async function processAiJobs(): Promise<void> {
  const jobs = await getAllJobs();

  for (const job of jobs) {
    try {
      await runJob(job);
    } catch {
      await failJob(job);
    }
  }
}
