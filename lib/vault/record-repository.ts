import { buildAiIndexText } from "@/lib/vault/ai-index";
import {
  deleteLocalVaultApiRecord,
  getLocalVaultApiRecord,
  isLocalVaultApiConfigured,
  listLocalVaultApiRecords,
  type LocalVaultApiRecord,
  upsertLocalVaultApiRecord
} from "@/lib/vault/local-vault-api";
import { type VaultRecord } from "@/lib/vault/types";

function sortRecordsByUpdatedAt(records: VaultRecord[]): VaultRecord[] {
  return [...records].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

function parseTagsJson(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    // Invalid JSON should not break the fallback path.
  }

  return [];
}

export function mapLocalVaultApiRecordToVaultRecord(record: LocalVaultApiRecord): VaultRecord {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    account_hint: record.account_hint,
    account_encrypted: record.account_encrypted,
    password_encrypted: record.password_encrypted,
    url: record.url,
    notes_summary: record.notes_summary,
    private_notes_encrypted: record.private_notes_encrypted,
    tags: parseTagsJson(record.tags_json),
    category: record.category,
    created_at: record.created_at,
    updated_at: record.updated_at,
    index_status: record.index_status
  };
}

export function mapVaultRecordToLocalVaultApiRecord(record: VaultRecord): LocalVaultApiRecord {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    account_hint: record.account_hint,
    account_encrypted: record.account_encrypted,
    password_encrypted: record.password_encrypted,
    url: record.url,
    notes_summary: record.notes_summary,
    private_notes_encrypted: record.private_notes_encrypted,
    tags_json: JSON.stringify(record.tags),
    category: record.category,
    ai_index_text: buildAiIndexText(record),
    index_status: record.index_status,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

export type RecordReadClients = {
  getApiRecord: (id: string) => Promise<LocalVaultApiRecord>;
  listApiRecords: () => Promise<LocalVaultApiRecord[]>;
};

export type RecordWriteClients = {
  deleteApiRecord: (id: string) => Promise<void>;
  upsertApiRecord: (record: LocalVaultApiRecord) => Promise<LocalVaultApiRecord>;
};

export type RecordSaveClients = Pick<RecordWriteClients, "upsertApiRecord">;
export type RecordDeleteClients = Pick<RecordWriteClients, "deleteApiRecord">;

export async function listVaultRecordsForReadWithClients(
  clients: Pick<RecordReadClients, "listApiRecords">
): Promise<VaultRecord[]> {
  return sortRecordsByUpdatedAt((await clients.listApiRecords()).map(mapLocalVaultApiRecordToVaultRecord));
}

export async function getVaultRecordForReadWithClients(
  id: string,
  clients: Pick<RecordReadClients, "getApiRecord">
): Promise<VaultRecord | null> {
  return mapLocalVaultApiRecordToVaultRecord(await clients.getApiRecord(id));
}

export async function listVaultRecordsForRead(): Promise<VaultRecord[]> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before loading vault records.");
  }

  return listVaultRecordsForReadWithClients({
    listApiRecords: listLocalVaultApiRecords
  });
}

export async function listStoredVaultRecords(): Promise<VaultRecord[]> {
  return listVaultRecordsForRead();
}

export async function getVaultRecordForRead(id: string): Promise<VaultRecord | null> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before loading vault records.");
  }

  return getVaultRecordForReadWithClients(id, {
    getApiRecord: getLocalVaultApiRecord
  });
}

export async function saveVaultRecordWithClients(
  record: VaultRecord,
  clients: RecordSaveClients
): Promise<VaultRecord> {
  return mapLocalVaultApiRecordToVaultRecord(await clients.upsertApiRecord(mapVaultRecordToLocalVaultApiRecord(record)));
}

export async function deleteVaultRecordWithClients(
  id: string,
  clients: RecordDeleteClients
): Promise<void> {
  await clients.deleteApiRecord(id);
}

export async function saveVaultRecord(record: VaultRecord): Promise<VaultRecord> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before saving vault records.");
  }

  return saveVaultRecordWithClients(record, {
    upsertApiRecord: upsertLocalVaultApiRecord
  });
}

export async function deleteVaultRecord(id: string): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before deleting vault records.");
  }

  return deleteVaultRecordWithClients(id, {
    deleteApiRecord: deleteLocalVaultApiRecord
  });
}

export async function syncRecordIndexStatus(recordId: string, status: VaultRecord["index_status"]): Promise<void> {
  const record = await getVaultRecordForRead(recordId);

  if (!record) {
    return;
  }

  await saveVaultRecord({
    ...record,
    index_status: status
  });
}
