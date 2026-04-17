import type { VaultJob, VaultRecord, VaultSettingKey, VaultSettingRecord } from "@/lib/storage/indexeddb";
import { deleteVaultJob, listVaultJobs, saveVaultJob } from "@/lib/vault/job-repository";
import { deleteVaultRecord, listVaultRecordsForRead, saveVaultRecord } from "@/lib/vault/record-repository";
import {
  deleteVaultSetting,
  getAllVaultSettings,
  setVaultSetting
} from "@/lib/vault/settings-repository";

export type VaultSnapshot = {
  format: "securevault-backup-v1";
  exported_at: string;
  jobs: VaultJob[];
  records: VaultRecord[];
  settings: VaultSettingRecord[];
};

type BackupRepositoryClients = {
  deleteJob: (id: string) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  deleteSetting: (key: VaultSettingKey) => Promise<void>;
  listJobs: () => Promise<VaultJob[]>;
  listRecords: () => Promise<VaultRecord[]>;
  listSettings: () => Promise<Partial<Record<VaultSettingKey, unknown>>>;
  saveJob: (job: VaultJob) => Promise<VaultJob>;
  saveRecord: (record: VaultRecord) => Promise<VaultRecord>;
  saveSetting: <T>(key: VaultSettingKey, value: T) => Promise<void>;
};

function toSettingsArray(settings: Partial<Record<VaultSettingKey, unknown>>): VaultSettingRecord[] {
  return Object.entries(settings).map(([key, value]) => ({
    key: key as VaultSettingKey,
    value
  }));
}

export async function createVaultSnapshotWithClients(
  clients: Pick<BackupRepositoryClients, "listJobs" | "listRecords" | "listSettings">
): Promise<VaultSnapshot> {
  const [settings, records, jobs] = await Promise.all([
    clients.listSettings(),
    clients.listRecords(),
    clients.listJobs()
  ]);

  return {
    format: "securevault-backup-v1",
    exported_at: new Date().toISOString(),
    settings: toSettingsArray(settings),
    records,
    jobs
  };
}

export async function replaceVaultSnapshotWithClients(
  snapshot: VaultSnapshot,
  clients: BackupRepositoryClients
): Promise<void> {
  const [existingSettings, existingRecords, existingJobs] = await Promise.all([
    clients.listSettings(),
    clients.listRecords(),
    clients.listJobs()
  ]);

  for (const job of existingJobs) {
    await clients.deleteJob(job.id);
  }

  for (const record of existingRecords) {
    await clients.deleteRecord(record.id);
  }

  for (const setting of toSettingsArray(existingSettings)) {
    await clients.deleteSetting(setting.key);
  }

  for (const setting of snapshot.settings) {
    await clients.saveSetting(setting.key, setting.value);
  }

  for (const record of snapshot.records) {
    await clients.saveRecord(record);
  }

  for (const job of snapshot.jobs) {
    await clients.saveJob(job);
  }
}

export async function createVaultSnapshot(): Promise<VaultSnapshot> {
  return createVaultSnapshotWithClients({
    listJobs: listVaultJobs,
    listRecords: listVaultRecordsForBackup,
    listSettings: getAllVaultSettings
  });
}

async function listVaultRecordsForBackup(): Promise<VaultRecord[]> {
  return listVaultRecordsForRead();
}

export async function replaceVaultSnapshot(snapshot: VaultSnapshot): Promise<void> {
  return replaceVaultSnapshotWithClients(snapshot, {
    deleteJob: deleteVaultJob,
    deleteRecord: deleteVaultRecord,
    deleteSetting: deleteVaultSetting,
    listJobs: listVaultJobs,
    listRecords: listVaultRecordsForBackup,
    listSettings: getAllVaultSettings,
    saveJob: saveVaultJob,
    saveRecord: saveVaultRecord,
    saveSetting: setVaultSetting
  });
}
