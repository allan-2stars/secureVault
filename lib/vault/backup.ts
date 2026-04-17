import { createVaultSnapshot, replaceVaultSnapshot, type VaultSnapshot } from "@/lib/vault/backup-repository";
import { listStoredVaultRecords } from "@/lib/vault/records";
import { queueUpsertJob } from "@/lib/vault/ai-jobs";

function ensureValidSnapshot(value: unknown): asserts value is VaultSnapshot {
  if (
    typeof value !== "object" ||
    value === null ||
    !("format" in value) ||
    (value as { format?: string }).format !== "securevault-backup-v1"
  ) {
    throw new Error("Backup file format is not supported.");
  }
}

export async function createBackupBlob(): Promise<Blob> {
  const snapshot = await createVaultSnapshot();
  return new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json"
  });
}

export async function restoreBackupFromText(text: string): Promise<void> {
  const parsed = JSON.parse(text) as unknown;
  ensureValidSnapshot(parsed);
  await replaceVaultSnapshot({
    ...parsed,
    jobs: []
  });
}

export async function requeueAllRecordsForIndexing(): Promise<void> {
  const records = await listStoredVaultRecords();

  for (const record of records) {
    await queueUpsertJob({
      ...record,
      index_status: "pending"
    });
  }
}
