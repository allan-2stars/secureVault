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
      {/* This card groups together the export/import actions for the vault. */}
      <h2>Backup and restore</h2>
      <p>
        Export the current vault snapshot as JSON and restore it later. After restore, the
        app will queue a fresh AI reindex without blocking local access.
      </p>
      <div className="hero-actions">
        {/* Export creates a downloadable JSON file of the current vault snapshot. */}
        <button className="button button-primary" disabled={backupInFlight} onClick={() => void onBackup()} type="button">
          {backupInFlight ? "Preparing backup..." : "Export backup"}
        </button>
        {/* The label is styled like a button, while the hidden file input lets the user choose a backup file. */}
        <label className="button button-secondary file-button">
          {importInFlight ? "Restoring..." : "Restore backup"}
          <input
            accept="application/json"
            className="file-input"
            disabled={importInFlight}
            onChange={(event) => {
              // Read the selected file and hand it to the parent component.
              const file = event.target.files?.[0];

              if (file) {
                void onImport(file);
              }

              // Reset the file input so selecting the same file again still triggers onChange.
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
    </article>
  );
}
