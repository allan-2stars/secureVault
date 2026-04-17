import {
  deleteSetting as deleteIndexedDbSetting,
  getAllSettings,
  getSetting as getIndexedDbSetting,
  setSetting as setIndexedDbSetting,
  setSettings as setIndexedDbSettings,
  type VaultSettingKey,
  type VaultSettingRecord
} from "@/lib/storage/indexeddb";
import {
  deleteLocalVaultApiSetting,
  getLocalVaultApiSetting,
  isLocalVaultApiConfigured,
  listLocalVaultApiSettings,
  upsertLocalVaultApiSetting
} from "@/lib/vault/local-vault-api";

type SettingsMap = Partial<Record<VaultSettingKey, unknown>>;

type SettingsReadClients = {
  getIndexedDbSetting: <T>(key: VaultSettingKey) => Promise<T | null>;
  getApiSetting?: (key: VaultSettingKey) => Promise<unknown>;
  getIndexedDbSettingsMap: () => Promise<SettingsMap>;
  listApiSettings?: () => Promise<Array<{ key: VaultSettingKey; value: unknown }>>;
};

type SettingsWriteClients = {
  deleteIndexedDbSetting: (key: VaultSettingKey) => Promise<void>;
  setIndexedDbSetting: <T>(key: VaultSettingKey, value: T) => Promise<void>;
  setIndexedDbSettings: (entries: Array<VaultSettingRecord>) => Promise<void>;
  deleteApiSetting?: (key: VaultSettingKey) => Promise<void>;
  upsertApiSetting?: (key: VaultSettingKey, value: unknown) => Promise<unknown>;
};

function toSettingsMap(entries: Array<{ key: VaultSettingKey; value: unknown }>): SettingsMap {
  return entries.reduce<SettingsMap>((accumulator, entry) => {
    accumulator[entry.key] = entry.value;
    return accumulator;
  }, {});
}

export async function getVaultSettingWithClients<T>(
  key: VaultSettingKey,
  clients: Pick<SettingsReadClients, "getIndexedDbSetting" | "getApiSetting">
): Promise<T | null> {
  if (!clients.getApiSetting) {
    return clients.getIndexedDbSetting<T>(key);
  }

  try {
    return (await clients.getApiSetting(key)) as T;
  } catch {
    throw new Error("Local Vault API is unavailable. Durable vault settings cannot be verified.");
  }
}

export async function getAllVaultSettingsWithClients(
  clients: Pick<SettingsReadClients, "getIndexedDbSettingsMap" | "listApiSettings">
): Promise<SettingsMap> {
  if (!clients.listApiSettings) {
    return clients.getIndexedDbSettingsMap();
  }

  try {
    return toSettingsMap(await clients.listApiSettings());
  } catch {
    throw new Error("Local Vault API is unavailable. Durable vault settings cannot be verified.");
  }
}

export async function setVaultSettingWithClients<T>(
  key: VaultSettingKey,
  value: T,
  clients: Pick<SettingsWriteClients, "setIndexedDbSetting" | "upsertApiSetting">
): Promise<void> {
  if (clients.upsertApiSetting) {
    await clients.upsertApiSetting(key, value);
  }

  await clients.setIndexedDbSetting(key, value);
}

export async function setVaultSettingsWithClients(
  entries: Array<VaultSettingRecord>,
  clients: SettingsWriteClients
): Promise<void> {
  if (clients.upsertApiSetting) {
    for (const entry of entries) {
      await clients.upsertApiSetting(entry.key, entry.value);
    }
  }

  await clients.setIndexedDbSettings(entries);
}

export async function deleteVaultSettingWithClients(
  key: VaultSettingKey,
  clients: Pick<SettingsWriteClients, "deleteIndexedDbSetting" | "deleteApiSetting">
): Promise<void> {
  if (clients.deleteApiSetting) {
    await clients.deleteApiSetting(key);
  }

  await clients.deleteIndexedDbSetting(key);
}

export async function getVaultSetting<T>(key: VaultSettingKey): Promise<T | null> {
  return getVaultSettingWithClients<T>(key, {
    getIndexedDbSetting,
    getApiSetting: isLocalVaultApiConfigured()
      ? async (settingKey) => (await getLocalVaultApiSetting(settingKey))?.value ?? null
      : undefined
  });
}

export async function getAllVaultSettings(): Promise<SettingsMap> {
  return getAllVaultSettingsWithClients({
    getIndexedDbSettingsMap: getAllSettings,
    listApiSettings: isLocalVaultApiConfigured()
      ? async () =>
          (await listLocalVaultApiSettings()).map((setting) => ({
            key: setting.key as VaultSettingKey,
            value: setting.value
          }))
      : undefined
  });
}

export async function setVaultSetting<T>(key: VaultSettingKey, value: T): Promise<void> {
  return setVaultSettingWithClients(key, value, {
    setIndexedDbSetting,
    upsertApiSetting: isLocalVaultApiConfigured() ? upsertLocalVaultApiSetting : undefined
  });
}

export async function setVaultSettings(entries: Array<VaultSettingRecord>): Promise<void> {
  return setVaultSettingsWithClients(entries, {
    deleteIndexedDbSetting,
    setIndexedDbSetting,
    setIndexedDbSettings,
    upsertApiSetting: isLocalVaultApiConfigured() ? upsertLocalVaultApiSetting : undefined
  });
}

export async function deleteVaultSetting(key: VaultSettingKey): Promise<void> {
  return deleteVaultSettingWithClients(key, {
    deleteIndexedDbSetting,
    deleteApiSetting: isLocalVaultApiConfigured() ? deleteLocalVaultApiSetting : undefined
  });
}
