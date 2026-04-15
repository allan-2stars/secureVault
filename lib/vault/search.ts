import type { VaultRecordSummary } from "@/lib/vault/records";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildSearchHaystack(record: VaultRecordSummary): string {
  return normalize(
    [
      record.title,
      record.type,
      record.category,
      record.url,
      record.notes_summary,
      record.account_hint,
      ...record.tags
    ].join(" ")
  );
}

export function filterRecordsByKeyword(
  records: VaultRecordSummary[],
  query: string
): VaultRecordSummary[] {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return records;
  }

  return records.filter((record) => {
    const haystack = buildSearchHaystack(record);
    return tokens.every((token) => haystack.includes(token));
  });
}
