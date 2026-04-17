import {
  getAllSettings,
  getSetting as getIndexedDbSetting,
  setSetting as setIndexedDbSetting,
  setSettings as setIndexedDbSettings,
  type VaultSettingKey,
  type VaultSettingRecord
} from "@/lib/storage/indexeddb";
import {
  getLocalVaultApiSetting,
  isLocalVaultApiConfigured,
  listLocalVaultApiSettings,
  upsertLocalVaultApiSetting
} from "@/lib/vault/local-vault-api";

type SettingsMap = Partial<Record<VaultSettingKey, unknown>>;

export const SQLITE_VAULT_SETTING_KEYS = [
  "vault_initialized",
  "password_salt",
  "password_verifier",
  "encryption_version",
  "app_mode"
] satisfies VaultSettingKey[];

type SettingsReadClients = {
  getIndexedDbSetting: <T>(key: VaultSettingKey) => Promise<T | null>;
  getApiSetting?: (key: VaultSettingKey) => Promise<unknown>;
  getIndexedDbSettingsMap: () => Promise<SettingsMap>;
  listApiSettings?: () => Promise<Array<{ key: VaultSettingKey; value: unknown }>>;
};

type SettingsWriteClients = {
  setIndexedDbSetting: <T>(key: VaultSettingKey, value: T) => Promise<void>;
  setIndexedDbSettings: (entries: Array<VaultSettingRecord>) => Promise<void>;
  upsertApiSetting?: (key: VaultSettingKey, value: unknown) => Promise<unknown>;
};

function isSQLiteBackedVaultKey(key: VaultSettingKey): boolean {
  return (SQLITE_VAULT_SETTING_KEYS as readonly VaultSettingKey[]).includes(key);
}

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
  if (!isSQLiteBackedVaultKey(key) || !clients.getApiSetting) {
    return clients.getIndexedDbSetting<T>(key);
  }

  try {
    return (await clients.getApiSetting(key)) as T;
  } catch {
    throw new Error("Local Vault API is unavailable. Vault protection cannot be verified.");
  }
}

export async function getAllVaultSettingsWithClients(
  clients: Pick<SettingsReadClients, "getIndexedDbSettingsMap" | "listApiSettings">
): Promise<SettingsMap> {
  if (!clients.listApiSettings) {
    return clients.getIndexedDbSettingsMap();
  }

  try {
    const apiSettings = await clients.listApiSettings();
    const indexedDbSettings = await clients.getIndexedDbSettingsMap();

    return {
      ...indexedDbSettings,
      ...toSettingsMap(apiSettings)
    };
  } catch {
    throw new Error("Local Vault API is unavailable. Vault protection cannot be verified.");
  }
}

export async function setVaultSettingWithClients<T>(
  key: VaultSettingKey,
  value: T,
  clients: Pick<SettingsWriteClients, "setIndexedDbSetting" | "upsertApiSetting">
): Promise<void> {
  if (isSQLiteBackedVaultKey(key) && clients.upsertApiSetting) {
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
      if (isSQLiteBackedVaultKey(entry.key)) {
        await clients.upsertApiSetting(entry.key, entry.value);
      }
    }
  }

  await clients.setIndexedDbSettings(entries);
}

export async function getVaultSetting<T>(key: VaultSettingKey): Promise<T | null> {
  return getVaultSettingWithClients<T>(key, {
    getIndexedDbSetting,
    getApiSetting: isLocalVaultApiConfigured()
      ? async (settingKey) => (await getLocalVaultApiSetting(settingKey)).value
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
    setIndexedDbSetting,
    setIndexedDbSettings,
    upsertApiSetting: isLocalVaultApiConfigured() ? upsertLocalVaultApiSetting : undefined
  });
}
