const DATABASE_NAME = "securevault-ai";
const DATABASE_VERSION = 2;

const SETTINGS_STORE = "vault_settings";
const RECORDS_STORE = "records";
const JOBS_STORE = "jobs";

type StoreName = typeof SETTINGS_STORE | typeof RECORDS_STORE | typeof JOBS_STORE;
type TransactionMode = IDBTransactionMode;

export type VaultSettingKey =
  | "ai_api_base_url"
  | "app_mode"
  | "encryption_version"
  | "password_salt"
  | "password_verifier"
  | "vault_initialized";

export type VaultSettingRecord<T = unknown> = {
  key: VaultSettingKey;
  value: T;
};

export type VaultRecord = {
  id: string;
  type: string;
  title: string;
  account_hint: string;
  account_encrypted: string;
  password_encrypted: string;
  url: string;
  notes_summary: string;
  private_notes_encrypted: string;
  tags: string[];
  category: string;
  created_at: string;
  updated_at: string;
  index_status: "synced" | "pending";
};

export type VaultJob = {
  id: string;
  type: "index_upsert" | "index_delete";
  payload: {
    record_id: string;
    ai_index_text?: string;
    category?: string;
    tags?: string[];
    type?: string;
  };
  status: "pending" | "running" | "failed";
  retry_count: number;
  last_attempt: string | null;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function ensureBrowserSupport() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB is unavailable in this environment.");
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function createDatabaseSchema(database: IDBDatabase) {
  if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
    database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
  }

  if (!database.objectStoreNames.contains(RECORDS_STORE)) {
    const records = database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
    records.createIndex("updated_at", "updated_at");
    records.createIndex("category", "category");
    records.createIndex("index_status", "index_status");
  }

  if (!database.objectStoreNames.contains(JOBS_STORE)) {
    const jobs = database.createObjectStore(JOBS_STORE, { keyPath: "id" });
    jobs.createIndex("status", "status");
    jobs.createIndex("type", "type");
  }
}

export function openVaultDatabase(): Promise<IDBDatabase> {
  ensureBrowserSupport();

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        createDatabaseSchema(request.result);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
    });
  }

  return databasePromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: TransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const database = await openVaultDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await callback(store);
  await transactionToPromise(transaction);
  return result;
}

export async function getSetting<T>(key: VaultSettingKey): Promise<T | null> {
  return withStore(SETTINGS_STORE, "readonly", async (store) => {
    const record = await requestToPromise(store.get(key) as IDBRequest<VaultSettingRecord<T> | undefined>);
    return record?.value ?? null;
  });
}

export async function setSetting<T>(key: VaultSettingKey, value: T): Promise<void> {
  await withStore(SETTINGS_STORE, "readwrite", (store) => {
    store.put({ key, value } satisfies VaultSettingRecord<T>);
  });
}

export async function setSettings(entries: Array<VaultSettingRecord>): Promise<void> {
  await withStore(SETTINGS_STORE, "readwrite", (store) => {
    entries.forEach((entry) => {
      store.put(entry);
    });
  });
}

export async function getAllSettings(): Promise<Partial<Record<VaultSettingKey, unknown>>> {
  return withStore(SETTINGS_STORE, "readonly", async (store) => {
    const records = await requestToPromise(store.getAll() as IDBRequest<VaultSettingRecord[]>);
    return records.reduce<Partial<Record<VaultSettingKey, unknown>>>((accumulator, record) => {
      accumulator[record.key] = record.value;
      return accumulator;
    }, {});
  });
}

export async function getRecord(id: string): Promise<VaultRecord | null> {
  return withStore(RECORDS_STORE, "readonly", async (store) => {
    const record = await requestToPromise(store.get(id) as IDBRequest<VaultRecord | undefined>);
    return record ?? null;
  });
}

export async function getAllRecords(): Promise<VaultRecord[]> {
  return withStore(RECORDS_STORE, "readonly", async (store) => {
    const records = await requestToPromise(store.getAll() as IDBRequest<VaultRecord[]>);
    return records.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  });
}

export async function putRecord(record: VaultRecord): Promise<void> {
  await withStore(RECORDS_STORE, "readwrite", (store) => {
    store.put(record);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  await withStore(RECORDS_STORE, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function getJob(id: string): Promise<VaultJob | null> {
  return withStore(JOBS_STORE, "readonly", async (store) => {
    const job = await requestToPromise(store.get(id) as IDBRequest<VaultJob | undefined>);
    return job ?? null;
  });
}

export async function getAllJobs(): Promise<VaultJob[]> {
  return withStore(JOBS_STORE, "readonly", async (store) => {
    const jobs = await requestToPromise(store.getAll() as IDBRequest<VaultJob[]>);
    return jobs.sort((left, right) => left.retry_count - right.retry_count);
  });
}

export async function putJob(job: VaultJob): Promise<void> {
  await withStore(JOBS_STORE, "readwrite", (store) => {
    store.put(job);
  });
}

export async function deleteJob(id: string): Promise<void> {
  await withStore(JOBS_STORE, "readwrite", (store) => {
    store.delete(id);
  });
}

export type VaultSnapshot = {
  format: "securevault-backup-v1";
  exported_at: string;
  jobs: VaultJob[];
  records: VaultRecord[];
  settings: VaultSettingRecord[];
};

export async function exportVaultSnapshot(): Promise<VaultSnapshot> {
  const [settingsMap, records, jobs] = await Promise.all([
    getAllSettings(),
    getAllRecords(),
    getAllJobs()
  ]);

  const settings = Object.entries(settingsMap).map(([key, value]) => ({
    key: key as VaultSettingKey,
    value
  }));

  return {
    format: "securevault-backup-v1",
    exported_at: new Date().toISOString(),
    settings,
    records,
    jobs
  };
}

export async function replaceVaultSnapshot(snapshot: VaultSnapshot): Promise<void> {
  const database = await openVaultDatabase();
  const transaction = database.transaction([SETTINGS_STORE, RECORDS_STORE, JOBS_STORE], "readwrite");
  const settingsStore = transaction.objectStore(SETTINGS_STORE);
  const recordsStore = transaction.objectStore(RECORDS_STORE);
  const jobsStore = transaction.objectStore(JOBS_STORE);

  settingsStore.clear();
  recordsStore.clear();
  jobsStore.clear();

  snapshot.settings.forEach((entry) => {
    settingsStore.put(entry);
  });

  snapshot.records.forEach((record) => {
    recordsStore.put(record);
  });

  snapshot.jobs.forEach((job) => {
    jobsStore.put(job);
  });

  await transactionToPromise(transaction);
}
