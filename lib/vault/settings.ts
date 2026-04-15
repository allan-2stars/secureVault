import {
  createPasswordVerifier,
  deriveMasterKey,
  getEncryptionVersion,
  generateSalt,
  verifyPasswordVerifier
} from "@/lib/crypto/vault-crypto";
import { getAllSettings, setSettings } from "@/lib/storage/indexeddb";

type VaultBootstrapState = {
  encryptionVersion: string | null;
  initialized: boolean;
  mode: "privacy" | null;
};

export async function getVaultBootstrapState(): Promise<VaultBootstrapState> {
  const settings = await getAllSettings();

  return {
    initialized: settings.vault_initialized === true,
    encryptionVersion:
      typeof settings.encryption_version === "string" ? settings.encryption_version : null,
    mode: settings.app_mode === "privacy" ? "privacy" : null
  };
}

export async function initializeVault(password: string): Promise<CryptoKey> {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 12) {
    throw new Error("Choose a master password with at least 12 characters.");
  }

  const salt = generateSalt();
  const key = await deriveMasterKey(normalizedPassword, salt);
  const passwordVerifier = await createPasswordVerifier(key);

  await setSettings([
    { key: "vault_initialized", value: true },
    { key: "password_salt", value: salt },
    { key: "password_verifier", value: passwordVerifier },
    { key: "encryption_version", value: getEncryptionVersion() },
    { key: "app_mode", value: "privacy" }
  ]);

  return key;
}

export async function unlockVault(password: string): Promise<CryptoKey> {
  const settings = await getAllSettings();
  const salt = settings.password_salt;
  const serializedVerifier = settings.password_verifier;

  if (typeof salt !== "string" || typeof serializedVerifier !== "string") {
    throw new Error("Vault settings are incomplete. Recreate the vault to continue.");
  }

  const key = await deriveMasterKey(password, salt);
  const isValid = await verifyPasswordVerifier(serializedVerifier, key);

  if (!isValid) {
    throw new Error("Incorrect master password.");
  }

  return key;
}
