import { getAllRecords, getRecord, type VaultRecord } from "@/lib/storage/indexeddb";
import { buildAiIndexText } from "@/lib/vault/ai-index";
import {
  deleteLocalVaultApiRecord,
  getLocalVaultApiRecord,
  isLocalVaultApiConfigured,
  listLocalVaultApiRecords,
  type LocalVaultApiRecord,
  upsertLocalVaultApiRecord
} from "@/lib/vault/local-vault-api";

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
  getIndexedDbRecord: (id: string) => Promise<VaultRecord | null>;
  listIndexedDbRecords: () => Promise<VaultRecord[]>;
  getApiRecord?: (id: string) => Promise<LocalVaultApiRecord>;
  listApiRecords?: () => Promise<LocalVaultApiRecord[]>;
};

export type RecordWriteClients = {
  deleteApiRecord?: (id: string) => Promise<void>;
  deleteIndexedDbRecord: (id: string) => Promise<void>;
  putIndexedDbRecord: (record: VaultRecord) => Promise<void>;
  upsertApiRecord?: (record: LocalVaultApiRecord) => Promise<LocalVaultApiRecord>;
};

export type RecordSaveClients = Pick<RecordWriteClients, "putIndexedDbRecord" | "upsertApiRecord">;
export type RecordDeleteClients = Pick<RecordWriteClients, "deleteApiRecord" | "deleteIndexedDbRecord">;

export async function listVaultRecordsForReadWithClients(
  clients: Pick<RecordReadClients, "listIndexedDbRecords" | "listApiRecords">
): Promise<VaultRecord[]> {
  if (!clients.listApiRecords) {
    return sortRecordsByUpdatedAt(await clients.listIndexedDbRecords());
  }

  try {
    return sortRecordsByUpdatedAt((await clients.listApiRecords()).map(mapLocalVaultApiRecordToVaultRecord));
  } catch {
    return sortRecordsByUpdatedAt(await clients.listIndexedDbRecords());
  }
}

export function choosePreferredRecord(
  apiRecord: VaultRecord | null,
  indexedDbRecord: VaultRecord | null
): VaultRecord | null {
  if (apiRecord) {
    return apiRecord;
  }

  return indexedDbRecord;
}

export async function getVaultRecordForReadWithClients(
  id: string,
  clients: Pick<RecordReadClients, "getIndexedDbRecord" | "getApiRecord">
): Promise<VaultRecord | null> {
  const indexedDbRecord = await clients.getIndexedDbRecord(id);

  if (!clients.getApiRecord) {
    return indexedDbRecord;
  }

  try {
    const apiRecord = mapLocalVaultApiRecordToVaultRecord(await clients.getApiRecord(id));
    return choosePreferredRecord(apiRecord, indexedDbRecord);
  } catch {
    return indexedDbRecord;
  }
}

export async function listVaultRecordsForRead(): Promise<VaultRecord[]> {
  return listVaultRecordsForReadWithClients({
    listIndexedDbRecords: getAllRecords,
    listApiRecords: isLocalVaultApiConfigured() ? listLocalVaultApiRecords : undefined
  });
}

export async function getVaultRecordForRead(id: string): Promise<VaultRecord | null> {
  return getVaultRecordForReadWithClients(id, {
    getIndexedDbRecord: getRecord,
    getApiRecord: isLocalVaultApiConfigured() ? getLocalVaultApiRecord : undefined
  });
}

export async function saveVaultRecordWithClients(
  record: VaultRecord,
  clients: RecordSaveClients
): Promise<VaultRecord> {
  const savedRecord = clients.upsertApiRecord
    ? mapLocalVaultApiRecordToVaultRecord(await clients.upsertApiRecord(mapVaultRecordToLocalVaultApiRecord(record)))
    : record;

  await clients.putIndexedDbRecord(savedRecord);
  return savedRecord;
}

export async function deleteVaultRecordWithClients(
  id: string,
  clients: RecordDeleteClients
): Promise<void> {
  if (clients.deleteApiRecord) {
    await clients.deleteApiRecord(id);
  }

  await clients.deleteIndexedDbRecord(id);
}

export async function saveVaultRecord(record: VaultRecord): Promise<VaultRecord> {
  return saveVaultRecordWithClients(record, {
    putIndexedDbRecord: async (nextRecord) => {
      const { putRecord } = await import("@/lib/storage/indexeddb");
      await putRecord(nextRecord);
    },
    upsertApiRecord: isLocalVaultApiConfigured() ? upsertLocalVaultApiRecord : undefined
  });
}

export async function deleteVaultRecord(id: string): Promise<void> {
  return deleteVaultRecordWithClients(id, {
    deleteApiRecord: isLocalVaultApiConfigured() ? deleteLocalVaultApiRecord : undefined,
    deleteIndexedDbRecord: async (recordId) => {
      const { deleteRecord } = await import("@/lib/storage/indexeddb");
      await deleteRecord(recordId);
    }
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
