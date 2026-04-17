import { getSetting } from "@/lib/storage/indexeddb";

type IndexUpsertPayload = {
  record_id: string;
  ai_index_text: string;
  category?: string;
  tags?: string[];
  type?: string;
};

type IndexDeletePayload = {
  record_id: string;
};

export type SemanticQueryResult = {
  record_id: string;
  score: number;
};

async function getAiApiBaseUrl(): Promise<string> {
  const configuredBaseUrl = await getSetting<string>("ai_api_base_url");

  if (!configuredBaseUrl?.trim()) {
    throw new Error("Set the Pi AI API URL before syncing the index.");
  }

  return configuredBaseUrl.trim().replace(/\/+$/, "");
}

async function postJson(path: string, payload: unknown): Promise<void> {
  const baseUrl = await getAiApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`AI sync failed with status ${response.status}.`);
  }
}

export async function checkAiApiHealth(): Promise<void> {
  const baseUrl = await getAiApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/health`, { method: "GET" });

  if (!response.ok) {
    throw new Error(`AI API health check failed with status ${response.status}.`);
  }
}

export async function upsertAiIndex(payload: IndexUpsertPayload): Promise<void> {
  await postJson("/api/index/upsert", {
    record_id: payload.record_id,
    ai_index_text: payload.ai_index_text,
    type: payload.type ?? "",
    category: payload.category ?? "",
    tags: payload.tags ?? []
  });
}

export async function deleteAiIndex(payload: IndexDeletePayload): Promise<void> {
  await postJson("/api/index/delete", payload);
}

export async function queryAiIndex(query: string, top_k = 5): Promise<SemanticQueryResult[]> {
  const baseUrl = await getAiApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/index/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      top_k
    })
  });

  if (!response.ok) {
    throw new Error(`AI semantic query failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    results?: SemanticQueryResult[];
  };

  return payload.results ?? [];
}
