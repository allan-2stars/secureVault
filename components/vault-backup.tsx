"use client";

type VaultBackupProps = {
  backupInFlight: boolean;
  importInFlight: boolean;
  onBackup: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
};

export function VaultBackup({
  backupInFlight,
  importInFlight,
  onBackup,
  onImport
}: VaultBackupProps) {
  return (
    <article className="card">
      <h2>Backup and restore</h2>
      <p>
        Export the current vault snapshot as JSON and restore it later. After restore, the
        app will queue a fresh AI reindex without blocking local access.
      </p>
      <div className="hero-actions">
        <button className="button button-primary" disabled={backupInFlight} onClick={() => void onBackup()} type="button">
          {backupInFlight ? "Preparing backup..." : "Export backup"}
        </button>
        <label className="button button-secondary file-button">
          {importInFlight ? "Restoring..." : "Restore backup"}
          <input
            accept="application/json"
            className="file-input"
            disabled={importInFlight}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void onImport(file);
              }

              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
    </article>
  );
}
