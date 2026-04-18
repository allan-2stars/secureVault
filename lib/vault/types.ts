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
