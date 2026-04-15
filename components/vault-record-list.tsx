"use client";

import type { VaultRecordSecrets, VaultRecordSummary } from "@/lib/vault/records";

type VaultRecordListProps = {
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string) => Promise<void>;
  onToggleReveal: (id: string) => Promise<void>;
  records: VaultRecordSummary[];
  revealedSecrets: Partial<Record<string, VaultRecordSecrets>>;
  revealInFlightId: string | null;
};

export function VaultRecordList({
  onDelete,
  onEdit,
  onToggleReveal,
  records,
  revealedSecrets,
  revealInFlightId
}: VaultRecordListProps) {
  return (
    <article className="card">
      <h2>Stored records</h2>
      <p>Secrets remain hidden until you explicitly reveal a record while unlocked.</p>
      {records.length === 0 ? (
        <p>No records yet. Create your first entry to test encrypted local storage.</p>
      ) : (
        <div className="record-list">
          {records.map((record) => {
            const revealed = revealedSecrets[record.id];

            return (
              <section className="record-item" key={record.id}>
                <div className="record-topline">
                  <div>
                    <h3>{record.title}</h3>
                    <p className="record-meta">
                      {record.type}
                      {record.category ? ` • ${record.category}` : ""}
                      {record.tags.length ? ` • ${record.tags.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="record-actions">
                    <button className="button button-secondary" onClick={() => void onEdit(record.id)} type="button">
                      Edit
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={revealInFlightId === record.id}
                      onClick={() => void onToggleReveal(record.id)}
                      type="button"
                    >
                      {revealInFlightId === record.id
                        ? "Working..."
                        : revealed
                          ? "Hide"
                          : "Reveal"}
                    </button>
                    <button className="button button-secondary" onClick={() => void onDelete(record.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="record-grid">
                  <div>
                    <strong>Account</strong>
                    <p>{revealed?.account || record.account_hint || "Hidden"}</p>
                  </div>
                  <div>
                    <strong>Password</strong>
                    <p>{revealed ? revealed.password || "(empty)" : "••••••••"}</p>
                  </div>
                  <div>
                    <strong>URL</strong>
                    <p>{record.url || "Not set"}</p>
                  </div>
                  <div>
                    <strong>Status</strong>
                    <p>{record.index_status}</p>
                  </div>
                  <div className="record-grid-span">
                    <strong>Notes summary</strong>
                    <p>{record.notes_summary || "No safe summary provided."}</p>
                  </div>
                  <div className="record-grid-span">
                    <strong>Private notes</strong>
                    <p>{revealed ? revealed.private_notes || "(empty)" : "Hidden until reveal"}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
