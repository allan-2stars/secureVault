export type LocalVaultApiRecord = {
  id: string;
  type: string;
  title: string;
  account_hint: string;
  account_encrypted: string;
  password_encrypted: string;
  url: string;
  notes_summary: string;
  private_notes_encrypted: string;
  tags_json: string;
  category: string;
  ai_index_text: string;
  index_status: "pending" | "synced";
  created_at: string;
  updated_at: string;
};

export type LocalVaultApiJob = {
  id: string;
  type: "index_upsert" | "index_delete";
  status: "pending" | "running" | "failed";
  payload: {
    record_id: string;
    ai_index_text?: string | null;
    category?: string | null;
    tags?: string[] | null;
    type?: string | null;
  };
  retry_count: number;
  last_attempt: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalVaultApiSetting = {
  key: string;
  value: unknown;
  updated_at: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function getLocalVaultApiBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL ?? "");
}

export function isLocalVaultApiConfigured(): boolean {
  return getLocalVaultApiBaseUrl().length > 0;
}

function requireLocalVaultApiBaseUrl(): string {
  const baseUrl = getLocalVaultApiBaseUrl();

  if (!baseUrl) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before using the Local Vault API.");
  }

  return baseUrl;
}

async function parseResponseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string;
    };

    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    // Fall back to the status code if the API did not return JSON.
  }

  return `Local Vault API request failed with status ${response.status}.`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${requireLocalVaultApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  return (await response.json()) as T;
}

export async function listLocalVaultApiRecords(): Promise<LocalVaultApiRecord[]> {
  return requestJson<LocalVaultApiRecord[]>("/api/records", {
    method: "GET"
  });
}

export async function getLocalVaultApiRecord(id: string): Promise<LocalVaultApiRecord> {
  return requestJson<LocalVaultApiRecord>(`/api/records/${id}`, {
    method: "GET"
  });
}

export async function upsertLocalVaultApiRecord(record: LocalVaultApiRecord): Promise<LocalVaultApiRecord> {
  return requestJson<LocalVaultApiRecord>("/api/records", {
    method: "POST",
    body: JSON.stringify(record)
  });
}

export async function deleteLocalVaultApiRecord(id: string): Promise<void> {
  const response = await fetch(`${requireLocalVaultApiBaseUrl()}/api/records/${id}`, {
    method: "DELETE",
    cache: "no-store"
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseResponseError(response));
  }
}

export async function listLocalVaultApiJobs(): Promise<LocalVaultApiJob[]> {
  return requestJson<LocalVaultApiJob[]>("/api/jobs", {
    method: "GET"
  });
}

export async function upsertLocalVaultApiJob(job: Omit<LocalVaultApiJob, "created_at" | "updated_at">): Promise<LocalVaultApiJob> {
  return requestJson<LocalVaultApiJob>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(job)
  });
}

export async function deleteLocalVaultApiJob(id: string): Promise<void> {
  const response = await fetch(`${requireLocalVaultApiBaseUrl()}/api/jobs/${id}`, {
    method: "DELETE",
    cache: "no-store"
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseResponseError(response));
  }
}

export async function listLocalVaultApiSettings(): Promise<LocalVaultApiSetting[]> {
  return requestJson<LocalVaultApiSetting[]>("/api/settings", {
    method: "GET"
  });
}

export async function getLocalVaultApiSetting(key: string): Promise<LocalVaultApiSetting> {
  return requestJson<LocalVaultApiSetting>(`/api/settings/${key}`, {
    method: "GET"
  });
}

export async function upsertLocalVaultApiSetting(key: string, value: unknown): Promise<LocalVaultApiSetting> {
  return requestJson<LocalVaultApiSetting>("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      key,
      value
    })
  });
}

export async function deleteLocalVaultApiSetting(key: string): Promise<void> {
  const response = await fetch(`${requireLocalVaultApiBaseUrl()}/api/settings/${key}`, {
    method: "DELETE",
    cache: "no-store"
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseResponseError(response));
  }
}
