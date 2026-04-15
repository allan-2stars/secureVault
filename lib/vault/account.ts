export function createAccountHint(account: string): string {
  const trimmed = account.trim();

  if (!trimmed) {
    return "";
  }

  const atIndex = trimmed.indexOf("@");

  if (atIndex > 1) {
    return `${trimmed[0]}***${trimmed.slice(atIndex)}`;
  }

  if (trimmed.length <= 2) {
    return `${trimmed[0] ?? ""}*`;
  }

  return `${trimmed.slice(0, 2)}***`;
}
