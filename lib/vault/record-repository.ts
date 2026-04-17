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

function buildRecordMap(records: VaultRecord[]): Map<string, VaultRecord> {
  return new Map(records.map((record) => [record.id, record]));
}

export function shouldUseIndexedDbFallback(
  apiRecords: VaultRecord[],
  indexedDbRecords: VaultRecord[]
): boolean {
  if (indexedDbRecords.length === 0) {
    return false;
  }

  if (apiRecords.length !== indexedDbRecords.length) {
    return true;
  }

  const apiRecordsById = buildRecordMap(apiRecords);

  return indexedDbRecords.some((indexedDbRecord) => {
    const apiRecord = apiRecordsById.get(indexedDbRecord.id);

    if (!apiRecord) {
      return true;
    }

    return apiRecord.updated_at < indexedDbRecord.updated_at;
  });
}

export type RecordReadClients = {
  getIndexedDbRecord: (id: string) => Promise<VaultRecord | null>;
  listIndexedDbRecords: () => Promise<VaultRecord[]>;
  getApiRecord?: (id: string) => Promise<LocalVaultApiRecord>;
  listApiRecords?: () => Promise<LocalVaultApiRecord[]>;
};

export async function listVaultRecordsForReadWithClients(
  clients: Pick<RecordReadClients, "listIndexedDbRecords" | "listApiRecords">
): Promise<VaultRecord[]> {
  const indexedDbRecords = await clients.listIndexedDbRecords();

  if (!clients.listApiRecords) {
    return sortRecordsByUpdatedAt(indexedDbRecords);
  }

  try {
    const apiRecords = sortRecordsByUpdatedAt((await clients.listApiRecords()).map(mapLocalVaultApiRecordToVaultRecord));

    if (shouldUseIndexedDbFallback(apiRecords, indexedDbRecords)) {
      return sortRecordsByUpdatedAt(indexedDbRecords);
    }

    return apiRecords;
  } catch {
    return sortRecordsByUpdatedAt(indexedDbRecords);
  }
}

export function choosePreferredRecord(
  apiRecord: VaultRecord | null,
  indexedDbRecord: VaultRecord | null
): VaultRecord | null {
  if (apiRecord && (!indexedDbRecord || apiRecord.updated_at >= indexedDbRecord.updated_at)) {
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

export async function mirrorRecordUpsert(record: VaultRecord): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    return;
  }

  try {
    await upsertLocalVaultApiRecord(mapVaultRecordToLocalVaultApiRecord(record));
  } catch {
    // SQLite mirroring is best-effort during the transition so local writes stay responsive.
  }
}

export async function mirrorRecordDelete(id: string): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    return;
  }

  try {
    await deleteLocalVaultApiRecord(id);
  } catch {
    // Delete mirroring is also best-effort until the write path fully migrates.
  }
}
