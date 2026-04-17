import type { VaultRecordSummary } from "@/lib/vault/records";
import type { SemanticQueryResult } from "@/lib/vault/ai-client";

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

function keywordMatchScore(record: VaultRecordSummary, query: string): number {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return 0;
  }

  const haystack = buildSearchHaystack(record);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export function rankSemanticResults(
  records: VaultRecordSummary[],
  semanticResults: SemanticQueryResult[],
  query: string
): VaultRecordSummary[] {
  const byId = new Map(records.map((record) => [record.id, record]));

  return semanticResults
    .map((result) => {
      const record = byId.get(result.record_id);

      if (!record) {
        return null;
      }

      return {
        record,
        rankScore: result.score + keywordMatchScore(record, query) * 0.05
      };
    })
    .filter((item): item is { rankScore: number; record: VaultRecordSummary } => Boolean(item))
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }

      return right.record.updated_at.localeCompare(left.record.updated_at);
    })
    .map((item) => item.record);
}
