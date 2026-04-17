import { verifyPasswordVerifier } from "@/lib/crypto/vault-crypto";
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

function getSnapshotSetting(snapshot: VaultSnapshot, key: string): unknown {
  return snapshot.settings.find((entry) => entry.key === key)?.value ?? null;
}

export async function restoreBackupFromText(
  text: string,
  sessionKey?: CryptoKey | null
): Promise<{ keepSession: boolean }> {
  const parsed = JSON.parse(text) as unknown;
  ensureValidSnapshot(parsed);
  const snapshot = {
    ...parsed,
    jobs: []
  };

  await replaceVaultSnapshot(snapshot);

  const serializedVerifier = getSnapshotSetting(snapshot, "password_verifier");
  const keepSession =
    sessionKey != null && typeof serializedVerifier === "string"
      ? await verifyPasswordVerifier(serializedVerifier, sessionKey)
      : false;

  return {
    keepSession
  };
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
