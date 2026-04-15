import { base64ToBytes, bytesToBase64 } from "@/lib/crypto/base64";

const VERIFIER_TEXT = "securevault::master-password-verifier";
const ENCRYPTION_VERSION = "aes-gcm-v1";
const KEY_DERIVATION_ITERATIONS = 250_000;
const IV_BYTES = 12;
const SALT_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
};

function ensureWebCrypto() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable in this environment.");
  }
}

function randomBytes(length: number): Uint8Array {
  ensureWebCrypto();
  return window.crypto.getRandomValues(new Uint8Array(length));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importPasswordKey(password: string): Promise<CryptoKey> {
  ensureWebCrypto();
  return window.crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, [
    "deriveKey"
  ]);
}

export function generateSalt(): string {
  return bytesToBase64(randomBytes(SALT_BYTES));
}

export function getEncryptionVersion() {
  return ENCRYPTION_VERSION;
}

export async function deriveMasterKey(password: string, salt: string): Promise<CryptoKey> {
  const passwordKey = await importPasswordKey(password);

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: KEY_DERIVATION_ITERATIONS,
      salt: toArrayBuffer(base64ToBytes(salt))
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptString(value: string, key: CryptoKey): Promise<EncryptedPayload> {
  ensureWebCrypto();
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    textEncoder.encode(value)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv)
  };
}

export async function decryptString(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  ensureWebCrypto();
  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64ToBytes(payload.iv))
    },
    key,
    toArrayBuffer(base64ToBytes(payload.ciphertext))
  );

  return textDecoder.decode(plaintext);
}

export async function createPasswordVerifier(key: CryptoKey): Promise<string> {
  const verifier = await encryptString(VERIFIER_TEXT, key);
  return JSON.stringify(verifier);
}

export async function verifyPasswordVerifier(serializedVerifier: string, key: CryptoKey): Promise<boolean> {
  try {
    const verifier = JSON.parse(serializedVerifier) as EncryptedPayload;
    const decrypted = await decryptString(verifier, key);
    return decrypted === VERIFIER_TEXT;
  } catch {
    return false;
  }
}
