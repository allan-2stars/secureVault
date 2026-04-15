function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

export function bytesToBase64(bytes: Uint8Array): string {
  return window.btoa(bytesToBinary(bytes));
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
