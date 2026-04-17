import { decryptString, encryptString } from "@/lib/crypto/vault-crypto";
import { type VaultRecord } from "@/lib/storage/indexeddb";
import { createAccountHint } from "@/lib/vault/account";
import {
  deleteVaultRecord,
  getVaultRecordForRead,
  listStoredVaultRecords as listStoredVaultRecordsFromRepository,
  listVaultRecordsForRead,
  saveVaultRecord
} from "@/lib/vault/record-repository";

export type VaultRecordFormValues = {
  account: string;
  category: string;
  notes_summary: string;
  password: string;
  private_notes: string;
  tags: string;
  title: string;
  type: string;
  url: string;
};

export type VaultRecordSummary = {
  category: string;
  created_at: string;
  id: string;
  index_status: "synced" | "pending";
  notes_summary: string;
  tags: string[];
  title: string;
  type: string;
  updated_at: string;
  url: string;
  account_hint: string;
};

export type VaultRecordSecrets = {
  account: string;
  password: string;
  private_notes: string;
};

export type VaultRecordEditorValues = VaultRecordFormValues & {
  id: string;
};

function parseTags(rawTags: string): string[] {
  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateRecord(values: VaultRecordFormValues) {
  if (!values.title.trim()) {
    throw new Error("Record title is required.");
  }

  if (!values.type.trim()) {
    throw new Error("Record type is required.");
  }
}

async function ensureUniqueTitle(title: string, excludeId?: string) {
  const normalizedTitle = title.trim().toLocaleLowerCase();
  const existingRecords = await listVaultRecordsForRead();
  const duplicate = existingRecords.find((record) => {
    if (excludeId && record.id === excludeId) {
      return false;
    }

    return record.title.trim().toLocaleLowerCase() === normalizedTitle;
  });

  if (duplicate) {
    throw new Error(`A record named "${duplicate.title}" already exists.`);
  }
}

async function encryptRecord(values: VaultRecordFormValues, key: CryptoKey, existingId?: string): Promise<VaultRecord> {
  validateRecord(values);

  const now = new Date().toISOString();
  const account = values.account.trim();
  const password = values.password;
  const privateNotes = values.private_notes.trim();

  const [accountEncrypted, passwordEncrypted, privateNotesEncrypted] = await Promise.all([
    encryptString(account, key),
    encryptString(password, key),
    encryptString(privateNotes, key)
  ]);

  return {
    id: existingId ?? crypto.randomUUID(),
    type: values.type.trim(),
    title: values.title.trim(),
    account_hint: createAccountHint(account),
    account_encrypted: JSON.stringify(accountEncrypted),
    password_encrypted: JSON.stringify(passwordEncrypted),
    url: values.url.trim(),
    notes_summary: values.notes_summary.trim(),
    private_notes_encrypted: JSON.stringify(privateNotesEncrypted),
    tags: parseTags(values.tags),
    category: values.category.trim(),
    created_at: now,
    updated_at: now,
    index_status: "pending"
  };
}

function toSummary(record: VaultRecord): VaultRecordSummary {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    account_hint: record.account_hint,
    url: record.url,
    notes_summary: record.notes_summary,
    tags: record.tags,
    category: record.category,
    created_at: record.created_at,
    updated_at: record.updated_at,
    index_status: record.index_status
  };
}

export async function listVaultRecords(): Promise<VaultRecordSummary[]> {
  const records = await listVaultRecordsForRead();
  return records.map(toSummary);
}

export async function listStoredVaultRecords(): Promise<VaultRecordSummary[]> {
  const records = await listStoredVaultRecordsFromRepository();
  return records.map(toSummary);
}

export async function createVaultRecord(
  values: VaultRecordFormValues,
  key: CryptoKey
): Promise<VaultRecordSummary> {
  await ensureUniqueTitle(values.title);
  const record = await encryptRecord(values, key);
  const savedRecord = await saveVaultRecord(record);
  return toSummary(savedRecord);
}

export async function updateVaultRecord(
  id: string,
  values: VaultRecordFormValues,
  key: CryptoKey
): Promise<VaultRecordSummary> {
  const existingRecord = await getVaultRecordForRead(id);

  if (!existingRecord) {
    throw new Error("Record not found.");
  }

  await ensureUniqueTitle(values.title, id);
  const updatedRecord = await encryptRecord(values, key, existingRecord.id);
  const savedRecord = {
    ...updatedRecord,
    created_at: existingRecord.created_at,
    updated_at: new Date().toISOString()
  };

  const persistedRecord = await saveVaultRecord(savedRecord);
  return toSummary(persistedRecord);
}

export async function removeVaultRecord(id: string): Promise<void> {
  await deleteVaultRecord(id);
}

export async function revealVaultRecordSecrets(
  id: string,
  key: CryptoKey
): Promise<VaultRecordSecrets> {
  const record = await getVaultRecordForRead(id);

  if (!record) {
    throw new Error("Record not found.");
  }

  const [account, password, private_notes] = await Promise.all([
    decryptString(JSON.parse(record.account_encrypted) as { ciphertext: string; iv: string }, key),
    decryptString(JSON.parse(record.password_encrypted) as { ciphertext: string; iv: string }, key),
    decryptString(JSON.parse(record.private_notes_encrypted) as { ciphertext: string; iv: string }, key)
  ]);

  return { account, password, private_notes };
}

export async function getVaultRecordEditorValues(
  id: string,
  key: CryptoKey
): Promise<VaultRecordEditorValues> {
  const record = await getVaultRecordForRead(id);

  if (!record) {
    throw new Error("Record not found.");
  }

  const secrets = await revealVaultRecordSecrets(id, key);

  return {
    id: record.id,
    type: record.type,
    title: record.title,
    account: secrets.account,
    password: secrets.password,
    url: record.url,
    notes_summary: record.notes_summary,
    private_notes: secrets.private_notes,
    tags: record.tags.join(", "),
    category: record.category
  };
}
