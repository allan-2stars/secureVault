import {
  createPasswordVerifier,
  deriveMasterKey,
  getEncryptionVersion,
  generateSalt,
  verifyPasswordVerifier
} from "@/lib/crypto/vault-crypto";
import { listVaultRecordsForRead } from "@/lib/vault/record-repository";
import { getAllVaultSettings, setVaultSettings } from "@/lib/vault/settings-repository";

type VaultBootstrapState = {
  aiApiBaseUrl: string;
  encryptionVersion: string | null;
  initialized: boolean;
  mode: "privacy" | null;
  setupBlockedReason: string | null;
};

export async function getVaultBootstrapState(): Promise<VaultBootstrapState> {
  const settings = await getAllVaultSettings();
  const records = await listVaultRecordsForRead();
  const initialized = settings.vault_initialized === true;
  const setupBlockedReason =
    !initialized && records.length > 0
      ? "Existing encrypted records were found in durable storage, but the vault verifier metadata is missing. Creating a new vault would orphan or overwrite protected data."
      : null;

  return {
    aiApiBaseUrl: typeof settings.ai_api_base_url === "string" ? settings.ai_api_base_url : "",
    initialized,
    encryptionVersion:
      typeof settings.encryption_version === "string" ? settings.encryption_version : null,
    mode: settings.app_mode === "privacy" ? "privacy" : null,
    setupBlockedReason
  };
}

export async function initializeVault(password: string): Promise<CryptoKey> {
  const existingSettings = await getAllVaultSettings();
  const existingRecords = await listVaultRecordsForRead();

  if (existingSettings.vault_initialized === true) {
    throw new Error("A vault already exists. Unlock it with the current master password.");
  }

  if (existingRecords.length > 0) {
    throw new Error(
      "Existing encrypted records are present in durable storage, but vault metadata is missing. A destructive reset flow is required before creating a new vault."
    );
  }

  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 12) {
    throw new Error("Choose a master password with at least 12 characters.");
  }

  const salt = generateSalt();
  const key = await deriveMasterKey(normalizedPassword, salt);
  const passwordVerifier = await createPasswordVerifier(key);

  await setVaultSettings([
    { key: "vault_initialized", value: true },
    { key: "password_salt", value: salt },
    { key: "password_verifier", value: passwordVerifier },
    { key: "encryption_version", value: getEncryptionVersion() },
    { key: "app_mode", value: "privacy" }
  ]);

  return key;
}

export async function unlockVault(password: string): Promise<CryptoKey> {
  const settings = await getAllVaultSettings();
  const salt = settings.password_salt;
  const serializedVerifier = settings.password_verifier;

  if (typeof salt !== "string" || typeof serializedVerifier !== "string") {
    throw new Error("Vault settings are incomplete or unavailable. Unlock cannot continue.");
  }

  const key = await deriveMasterKey(password, salt);
  const isValid = await verifyPasswordVerifier(serializedVerifier, key);

  if (!isValid) {
    throw new Error("Incorrect master password.");
  }

  return key;
}
