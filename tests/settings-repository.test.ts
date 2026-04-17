import test from "node:test";
import assert from "node:assert/strict";

import {
  getAllVaultSettingsWithClients,
  getVaultSettingWithClients,
  setVaultSettingsWithClients
} from "@/lib/vault/settings-repository";
import {
  createPasswordVerifier,
  deriveMasterKey,
  verifyPasswordVerifier
} from "@/lib/crypto/vault-crypto";

function installWindowCrypto() {
  const webCrypto = globalThis.crypto;

  if (!webCrypto) {
    throw new Error("Node Web Crypto is unavailable in this environment.");
  }

  Object.assign(globalThis, {
    window: {
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
      btoa: (value: string) => Buffer.from(value, "binary").toString("base64"),
      crypto: webCrypto
    }
  });
}

test("existing vault detection uses SQLite-backed settings as the source of truth", async () => {
  const settings = await getAllVaultSettingsWithClients({
    getIndexedDbSettingsMap: async () => ({}),
    listApiSettings: async () => [
      { key: "vault_initialized", value: true },
      { key: "encryption_version", value: "aes-gcm-v1" },
      { key: "app_mode", value: "privacy" }
    ]
  });

  assert.equal(settings.vault_initialized, true);
  assert.equal(settings.encryption_version, "aes-gcm-v1");
});

test("vault metadata cannot silently fall back to a fresh setup when SQLite settings are unavailable", async () => {
  await assert.rejects(
    () =>
      getVaultSettingWithClients("vault_initialized", {
        getIndexedDbSetting: async () => null,
        getApiSetting: async () => {
          throw new Error("SQLite unavailable");
        }
      }),
    /Vault protection cannot be verified/
  );
});

test("fresh setup is blocked when an initialized vault already exists", async () => {
  let apiWrites = 0;

  await setVaultSettingsWithClients(
    [
      { key: "vault_initialized", value: true },
      { key: "password_salt", value: "salt" },
      { key: "password_verifier", value: "verifier" },
      { key: "encryption_version", value: "aes-gcm-v1" },
      { key: "app_mode", value: "privacy" }
    ],
    {
      setIndexedDbSetting: async () => {},
      setIndexedDbSettings: async () => {},
      upsertApiSetting: async () => {
        apiWrites += 1;
        return null;
      }
    }
  );

  assert.equal(apiWrites, 5);
});

test("correct master password verification still succeeds against persisted verifier material", async () => {
  installWindowCrypto();
  const salt = "MDEyMzQ1Njc4OWFiY2RlZg==";
  const password = "a very strong local vault password";
  const key = await deriveMasterKey(password, salt);
  const verifier = await createPasswordVerifier(key);
  const unlockKey = await deriveMasterKey(password, salt);
  const isValid = await verifyPasswordVerifier(verifier, unlockKey);

  assert.equal(typeof verifier, "string");
  assert.equal(unlockKey.type, "secret");
  assert.equal(isValid, true);
});
