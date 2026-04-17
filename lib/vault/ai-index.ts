import type { VaultRecordSummary } from "@/lib/vault/records";

const BLOCKED_TERMS = [
  "password",
  "api_key",
  "apikey",
  "token",
  "secret",
  "recovery_code"
];

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripBlockedTerms(value: string): string {
  return BLOCKED_TERMS.reduce((current, term) => {
    const pattern = new RegExp(`\\b${term.replace("_", "[_\\s]?")}\\b`, "gi");
    return current.replace(pattern, " ");
  }, value);
}

function extractHostname(url: string): string {
  if (!url.trim()) {
    return "";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function buildAiIndexText(record: Pick<VaultRecordSummary, "title" | "type" | "category" | "tags" | "notes_summary" | "url">): string {
  const raw = [
    record.title,
    record.type,
    record.category,
    record.tags.join(" "),
    record.notes_summary,
    extractHostname(record.url)
  ]
    .filter(Boolean)
    .join(" ");

  return compactWhitespace(stripBlockedTerms(raw)).slice(0, 2000);
}
