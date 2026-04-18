import {
  deleteLocalVaultApiSetting,
  getLocalVaultApiSetting,
  isLocalVaultApiConfigured,
  listLocalVaultApiSettings,
  upsertLocalVaultApiSetting
} from "@/lib/vault/local-vault-api";
import { type VaultSettingKey, type VaultSettingRecord } from "@/lib/vault/types";

type SettingsMap = Partial<Record<VaultSettingKey, unknown>>;

type SettingsReadClients = {
  getApiSetting: (key: VaultSettingKey) => Promise<unknown>;
  listApiSettings: () => Promise<Array<{ key: VaultSettingKey; value: unknown }>>;
};

type SettingsWriteClients = {
  deleteApiSetting: (key: VaultSettingKey) => Promise<void>;
  upsertApiSetting: (key: VaultSettingKey, value: unknown) => Promise<unknown>;
};

function toSettingsMap(entries: Array<{ key: VaultSettingKey; value: unknown }>): SettingsMap {
  return entries.reduce<SettingsMap>((accumulator, entry) => {
    accumulator[entry.key] = entry.value;
    return accumulator;
  }, {});
}

export async function getVaultSettingWithClients<T>(
  key: VaultSettingKey,
  clients: Pick<SettingsReadClients, "getApiSetting">
): Promise<T | null> {
  try {
    return (await clients.getApiSetting(key)) as T;
  } catch {
    throw new Error("Local Vault API is unavailable. Durable vault settings cannot be verified.");
  }
}

export async function getAllVaultSettingsWithClients(
  clients: Pick<SettingsReadClients, "listApiSettings">
): Promise<SettingsMap> {
  try {
    return toSettingsMap(await clients.listApiSettings());
  } catch {
    throw new Error("Local Vault API is unavailable. Durable vault settings cannot be verified.");
  }
}

export async function setVaultSettingWithClients<T>(
  key: VaultSettingKey,
  value: T,
  clients: Pick<SettingsWriteClients, "upsertApiSetting">
): Promise<void> {
  await clients.upsertApiSetting(key, value);
}

export async function setVaultSettingsWithClients(
  entries: Array<VaultSettingRecord>,
  clients: SettingsWriteClients
): Promise<void> {
  for (const entry of entries) {
    await clients.upsertApiSetting(entry.key, entry.value);
  }
}

export async function deleteVaultSettingWithClients(
  key: VaultSettingKey,
  clients: Pick<SettingsWriteClients, "deleteApiSetting">
): Promise<void> {
  await clients.deleteApiSetting(key);
}

export async function getVaultSetting<T>(key: VaultSettingKey): Promise<T | null> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before loading vault settings.");
  }

  return getVaultSettingWithClients<T>(key, {
    getApiSetting: async (settingKey) => (await getLocalVaultApiSetting(settingKey))?.value ?? null
  });
}

export async function getAllVaultSettings(): Promise<SettingsMap> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before loading vault settings.");
  }

  return getAllVaultSettingsWithClients({
    listApiSettings: async () =>
      (await listLocalVaultApiSettings()).map((setting) => ({
        key: setting.key as VaultSettingKey,
        value: setting.value
      }))
  });
}

export async function setVaultSetting<T>(key: VaultSettingKey, value: T): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before saving vault settings.");
  }

  return setVaultSettingWithClients(key, value, {
    upsertApiSetting: upsertLocalVaultApiSetting
  });
}

export async function setVaultSettings(entries: Array<VaultSettingRecord>): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before saving vault settings.");
  }

  return setVaultSettingsWithClients(entries, {
    deleteApiSetting: deleteLocalVaultApiSetting,
    upsertApiSetting: upsertLocalVaultApiSetting
  });
}

export async function deleteVaultSetting(key: VaultSettingKey): Promise<void> {
  if (!isLocalVaultApiConfigured()) {
    throw new Error("Set NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL before deleting vault settings.");
  }

  return deleteVaultSettingWithClients(key, {
    deleteApiSetting: deleteLocalVaultApiSetting
  });
}
