"use client";

import { FormEvent, useEffect, useState } from "react";

import { VaultBackup } from "@/components/vault-backup";
import { ConnectionStatus } from "@/components/connection-status";
import { VaultRecordForm } from "@/components/vault-record-form";
import { VaultRecordList } from "@/components/vault-record-list";
import { VaultSearch } from "@/components/vault-search";
import { checkAiApiHealth, queryAiIndex } from "@/lib/vault/ai-client";
import { createBackupBlob, restoreBackupFromText, requeueAllRecordsForIndexing } from "@/lib/vault/backup";
import { processAiJobs, queueDeleteJob, queueUpsertJob } from "@/lib/vault/ai-jobs";
import {
  createVaultRecord,
  getVaultRecordEditorValues,
  listVaultRecords,
  removeVaultRecord,
  revealVaultRecordSecrets,
  updateVaultRecord,
  type VaultRecordEditorValues,
  type VaultRecordSecrets,
  type VaultRecordSummary
} from "@/lib/vault/records";
import { filterRecordsByKeyword, rankSemanticResults } from "@/lib/vault/search";
import { listVaultJobs } from "@/lib/vault/job-repository";
import { isDesktopRuntime } from "@/lib/vault/runtime";
import { getVaultSetting, setVaultSetting } from "@/lib/vault/settings-repository";
import { getVaultBootstrapState, initializeVault, unlockVault } from "@/lib/vault/settings";

type VaultStatus = "loading" | "setup" | "locked" | "ready" | "unavailable";

const setupHighlights = [
  "Master password is used to derive an AES-GCM key in the browser.",
  "Secret fields remain local and encrypted before SQLite persistence.",
  "The derived key stays in memory only for the current session."
];

const readyHighlights = [
  "Local Vault API + SQLite is the durable boundary for vault data.",
  "AES-GCM encryption helpers are ready for record-level secret fields.",
  "The vault session key remains in memory only on this device."
];

function sortRecordsByUpdatedAt(records: VaultRecordSummary[]) {
  return [...records].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function shouldRetryDesktopStartup(error: unknown) {
  return (
    isDesktopRuntime &&
    error instanceof Error &&
    error.message.includes("Local Vault API is unavailable")
  );
}

export function VaultConsole() {
  // High-level screen state: whether the vault is setting up, locked, ready, etc.
  const [status, setStatus] = useState<VaultStatus>("loading");
  // These values come from local vault settings and help explain the current vault state in the UI.
  const [encryptionVersion, setEncryptionVersion] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<string | null>(null);
  const [setupBlockedReason, setSetupBlockedReason] = useState<string | null>(null);
  // feedback is for general user-facing messages like "saved", "restored", or errors.
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The derived CryptoKey is kept only in memory for the unlocked session.
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  // The main local view of the record list.
  const [records, setRecords] = useState<VaultRecordSummary[]>([]);
  const [recordSubmitInFlight, setRecordSubmitInFlight] = useState(false);
  // If this is set, the form is editing an existing record instead of creating a new one.
  const [recordBeingEdited, setRecordBeingEdited] = useState<VaultRecordEditorValues | null>(null);
  // Revealed secrets are stored temporarily in memory per record after explicit reveal.
  const [revealedSecrets, setRevealedSecrets] = useState<Partial<Record<string, VaultRecordSecrets>>>({});
  const [revealInFlightId, setRevealInFlightId] = useState<string | null>(null);
  // Search UI state.
  const [searchQuery, setSearchQuery] = useState("");
  // Pi wrapper connection settings and queue status.
  const [aiApiBaseUrl, setAiApiBaseUrl] = useState("");
  const [pendingJobCount, setPendingJobCount] = useState(0);
  const [isAiSyncRunning, setIsAiSyncRunning] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  // Semantic search state is kept separate from keyword search so we can fall back cleanly.
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [semanticResults, setSemanticResults] = useState<VaultRecordSummary[] | null>(null);
  const [semanticSearchInFlight, setSemanticSearchInFlight] = useState(false);
  const [semanticStatusMessage, setSemanticStatusMessage] = useState<string | null>(null);
  // Backup/restore progress flags.
  const [backupInFlight, setBackupInFlight] = useState(false);
  const [restoreInFlight, setRestoreInFlight] = useState(false);

  const refreshRecords = async () => {
    // Reload the visible record summaries from local storage.
    const nextRecords = await listVaultRecords();
    setRecords(nextRecords);
  };

  const refreshJobCount = async () => {
    // Count queued AI sync jobs so the UI can show the current background-sync workload.
    const jobs = await listVaultJobs();
    setPendingJobCount(jobs.length);
  };

  const runAiSync = async () => {
    // Avoid starting a second queue processor while one is already running.
    if (isAiSyncRunning) {
      return;
    }

    setIsAiSyncRunning(true);

    try {
      // Process queued AI sync jobs, then refresh the UI so index status stays current.
      await processAiJobs();
      await Promise.all([refreshRecords(), refreshJobCount()]);
    } finally {
      setIsAiSyncRunning(false);
    }
  };

  // Keyword results are always available locally.
  const keywordResults = filterRecordsByKeyword(records, searchQuery);
  // In semantic mode, prefer semantic results if available; otherwise fall back to keyword results.
  const visibleRecords = isSemanticMode ? semanticResults ?? keywordResults : keywordResults;
  const searchMatchLabel = !searchQuery.trim()
    ? `${records.length} records available for local search.`
    : isSemanticMode
      ? `${visibleRecords.length} semantic results shown from ${records.length} local records.`
      : `${visibleRecords.length} of ${records.length} records match this query.`;

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      const maxAttempts = isDesktopRuntime ? 15 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          // Read vault/bootstrap settings from durable storage when the screen first loads.
          const bootstrap = await getVaultBootstrapState();

          if (cancelled) {
            return;
          }

          setEncryptionVersion(bootstrap.encryptionVersion);
          setAppMode(bootstrap.mode);
          setSetupBlockedReason(bootstrap.setupBlockedReason);
          setStatus(bootstrap.setupBlockedReason ? "unavailable" : bootstrap.initialized ? "locked" : "setup");
          setAiApiBaseUrl((await getVaultSetting<string>("ai_api_base_url")) ?? "");
          await refreshJobCount();
          await refreshRecords();
          return;
        } catch (error) {
          if (cancelled) {
            return;
          }

          if (attempt < maxAttempts && shouldRetryDesktopStartup(error)) {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            continue;
          }

          setFeedback(getErrorMessage(error));
          setStatus("unavailable");
          return;
        }
      }
    };

    void loadState();

    return () => {
      // Prevent state updates if the component unmounts before async work finishes.
      cancelled = true;
    };
  }, []);

  const handleSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    // Basic client-side confirmation before deriving and storing vault settings.
    if (password !== confirmPassword) {
      setFeedback("The master password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const key = await initializeVault(password);
      setSessionKey(key);
      setEncryptionVersion("aes-gcm-v1");
      setAppMode("privacy");
      setSetupBlockedReason(null);
      setStatus("ready");
      setFeedback("Vault created locally. You are now unlocked for this session.");
      form.reset();
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);

    try {
      // Unlock derives the key locally and verifies it against the encrypted verifier.
      const key = await unlockVault(password);
      setSessionKey(key);
      setStatus("ready");
      setFeedback("Vault unlocked locally.");
      form.reset();
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = () => {
    // Locking clears only in-memory/session UI state. The actual stored vault data remains local.
    setSessionKey(null);
    setRecordBeingEdited(null);
    setRevealedSecrets({});
    setFeedback("Vault locked. Your session key has been cleared from memory.");
    setSearchQuery("");
    setSemanticResults(null);
    setSemanticStatusMessage(null);
    setStatus("locked");
  };

  useEffect(() => {
    if (!sessionKey || status !== "ready") {
      return;
    }

    // Once unlocked, refresh records and queued jobs, then try to process any pending AI sync work.
    void refreshRecords();
    void refreshJobCount();
    void runAiSync();
  }, [sessionKey, status]);

  useEffect(() => {
    // Leaving semantic mode clears semantic-only state so the UI goes back to pure local keyword behavior.
    if (!isSemanticMode) {
      setSemanticResults(null);
      setSemanticStatusMessage(null);
    }
  }, [isSemanticMode]);

  const handleRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sessionKey) {
      setFeedback("Unlock the vault before saving a record.");
      return;
    }

    setFeedback(null);
    setRecordSubmitInFlight(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    // Read plain form values first; secret fields are encrypted later inside the record service.
    const values = {
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? ""),
      category: String(formData.get("category") ?? ""),
      tags: String(formData.get("tags") ?? ""),
      account: String(formData.get("account") ?? ""),
      password: String(formData.get("password") ?? ""),
      url: String(formData.get("url") ?? ""),
      notes_summary: String(formData.get("notes_summary") ?? ""),
      private_notes: String(formData.get("private_notes") ?? "")
    };

    try {
      if (recordBeingEdited) {
        // Update the record locally first, then queue the AI sync separately.
        const updatedRecord = await updateVaultRecord(recordBeingEdited.id, values, sessionKey);
        await queueUpsertJob(updatedRecord);
        setRecords((current) =>
          sortRecordsByUpdatedAt(
            current.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
          )
        );
        setFeedback("Record updated locally.");
      } else {
        // Create the record locally first, then queue indexing in the background.
        const createdRecord = await createVaultRecord(values, sessionKey);
        await queueUpsertJob(createdRecord);
        setRecords((current) => sortRecordsByUpdatedAt([createdRecord, ...current]));
        setFeedback("Record saved locally.");
      }

      setRecordBeingEdited(null);
      setRevealedSecrets({});
      form.reset();
      await refreshJobCount();
      // Clear stale semantic results because the underlying records changed.
      setSemanticResults(null);
      void runAiSync();
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setRecordSubmitInFlight(false);
    }
  };

  const handleEditRecord = async (id: string) => {
    if (!sessionKey) {
      setFeedback("Unlock the vault before editing a record.");
      return;
    }

    try {
      // Load the full decrypted values so the form can be populated for editing.
      const editorValues = await getVaultRecordEditorValues(id, sessionKey);
      setRecordBeingEdited(editorValues);
      setFeedback("Editing record locally.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      // Queue AI index deletion, but do not wait for that network call before removing the local record.
      await queueDeleteJob(id);
      await removeVaultRecord(id);
      setRecords((current) => current.filter((record) => record.id !== id));
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (recordBeingEdited?.id === id) {
        setRecordBeingEdited(null);
      }
      await refreshJobCount();
      setSemanticResults((current) => current?.filter((record) => record.id !== id) ?? null);
      void runAiSync();
      setFeedback("Record deleted locally.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleToggleRevealRecord = async (id: string) => {
    if (!sessionKey) {
      setFeedback("Unlock the vault before revealing secrets.");
      return;
    }

    if (revealedSecrets[id]) {
      // Hide simply removes the decrypted values from in-memory UI state.
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealInFlightId(id);

    try {
      // Reveal decrypts only this one record's secret fields on demand.
      const secrets = await revealVaultRecordSecrets(id, sessionKey);
      setRevealedSecrets((current) => ({ ...current, [id]: secrets }));
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setRevealInFlightId(null);
    }
  };

  const handleAiEndpointSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAiStatusMessage(null);

    const formData = new FormData(event.currentTarget);
    const nextUrl = String(formData.get("ai_api_base_url") ?? "").trim();

    try {
      // Save the Pi wrapper base URL locally so the browser knows where to send AI requests.
      await setVaultSetting("ai_api_base_url", nextUrl);
      setAiApiBaseUrl(nextUrl);
      setAiStatusMessage("Pi AI API URL saved locally.");
    } catch (error) {
      setAiStatusMessage(getErrorMessage(error));
    }
  };

  const handleAiHealthCheck = async () => {
    setAiStatusMessage(null);

    try {
      // This verifies the browser can reach the Pi wrapper from the current origin.
      await checkAiApiHealth();
      setAiStatusMessage("Pi AI API is reachable.");
    } catch (error) {
      setAiStatusMessage(getErrorMessage(error));
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSemanticResults(keywordResults);
      setSemanticStatusMessage("Enter a query to run semantic search.");
      return;
    }

    setSemanticSearchInFlight(true);
    setSemanticStatusMessage(null);

    try {
      // Ask the Pi wrapper for related record ids, then rank the results against local summaries.
      const aiResults = await queryAiIndex(searchQuery, 10);
      const ranked = rankSemanticResults(records, aiResults, searchQuery);

      if (ranked.length === 0) {
        // If semantic search returns weak or irrelevant results, fall back to local keyword search.
        setSemanticResults(keywordResults);
        setSemanticStatusMessage("No semantic matches found. Showing local keyword results instead.");
      } else {
        setSemanticResults(ranked);
        setSemanticStatusMessage(`Showing ${ranked.length} semantic matches from the Pi AI index.`);
      }
    } catch (error) {
      // Any Pi/Chroma/API failure falls back to the local keyword result set instead of breaking search.
      setSemanticResults(keywordResults);
      setSemanticStatusMessage(`${getErrorMessage(error)} Falling back to local keyword results.`);
    } finally {
      setSemanticSearchInFlight(false);
    }
  };

  const handleBackupExport = async () => {
    setBackupInFlight(true);

    try {
      // Build a portable JSON snapshot of settings, records, and queued jobs.
      const blob = await createBackupBlob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `securevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      setFeedback("Backup exported.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setBackupInFlight(false);
    }
  };

  const handleBackupImport = async (file: File) => {
    setRestoreInFlight(true);

    try {
      // Read the uploaded backup file as text and replace the local snapshot with it.
      const text = await file.text();
      const restoreResult = await restoreBackupFromText(text, sessionKey);
      await Promise.all([refreshRecords(), refreshJobCount()]);
      // After restore, queue a fresh AI reindex so the Pi side can rebuild from the restored data.
      await requeueAllRecordsForIndexing();
      await refreshJobCount();
      setRecordBeingEdited(null);
      setRevealedSecrets({});
      setSearchQuery("");
      setSemanticResults(null);
      setSemanticStatusMessage(null);

      if (restoreResult.keepSession) {
        setStatus("ready");
        setFeedback("Backup restored. Your current vault session stayed unlocked and all records were queued for reindex.");
      } else {
        // Lock when the restored vault does not match the current in-memory key.
        setSessionKey(null);
        setStatus("locked");
        setFeedback("Backup restored. Enter the matching master password to unlock the restored vault. All records were queued for reindex.");
      }
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setRestoreInFlight(false);
    }
  };

  return (
    <main className="shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">SV</div>
          <div className="brand-copy">
            <strong>SecureVault AI</strong>
            <span>Post-SQLite durable local vault</span>
          </div>
        </div>
        <ConnectionStatus />
      </header>

      <section className="hero">
        <div className="eyebrow">Local API + SQLite durable boundary</div>
        <h1>Unlock local encryption first.</h1>
        <p>
          The vault now uses the Local Vault API and SQLite as the durable local storage
          boundary. No secret data leaves the client, and the derived key is kept in memory
          for the active session only.
        </p>
        <div className="status-bar">
          <div className="status-pill">
            <strong>Mode</strong>
            {appMode ?? "privacy (pending setup)"}
          </div>
          <div className="status-pill">
            <strong>Encryption</strong>
            {encryptionVersion ?? "not initialized"}
          </div>
          <div className="status-pill">
            <strong>Session</strong>
            {sessionKey ? "unlocked in memory" : "locked"}
          </div>
        </div>
      </section>

      {feedback ? <p className="feedback">{feedback}</p> : null}

      {status === "loading" ? (
        <section className="grid">
          <article className="card">
            <h2>Loading vault status</h2>
            <p>Checking the Local Vault API and durable vault settings.</p>
          </article>
        </section>
      ) : null}

      {status === "unavailable" ? (
        <section className="grid">
          <article className="card">
            <h2>{setupBlockedReason ? "Vault recovery required" : "Browser support required"}</h2>
            <p>
              {setupBlockedReason ??
                "SecureVault AI needs the Local Vault API and Web Crypto to initialize the local vault in a safe way."}
            </p>
          </article>
        </section>
      ) : null}

      {status === "setup" ? (
        <section className="grid grid-two vault-panel">
          <article className="card">
            <h2>Create the vault</h2>
            <p>
              The master password is never stored. It only derives the local encryption key
              used to protect future secret fields.
            </p>
            <form className="vault-form" onSubmit={handleSetup}>
              <label>
                Master password
                <input autoComplete="new-password" minLength={12} name="password" type="password" />
              </label>
              <label>
                Confirm master password
                <input
                  autoComplete="new-password"
                  minLength={12}
                  name="confirmPassword"
                  type="password"
                />
              </label>
              <button className="button button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating vault..." : "Create local vault"}
              </button>
            </form>
          </article>
          <article className="card">
            <h2>Guardrails</h2>
            <ul>
              {setupHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {status === "locked" ? (
        <section className="grid grid-two vault-panel">
          <article className="card">
            <h2>Unlock the vault</h2>
            <p>
              Unlocking derives the AES key locally and verifies it against an encrypted
              local-only verifier stored in SQLite through the Local Vault API.
            </p>
            <form className="vault-form" onSubmit={handleUnlock}>
              <label>
                Master password
                <input autoComplete="current-password" name="password" type="password" />
              </label>
              <button className="button button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Unlocking..." : "Unlock vault"}
              </button>
            </form>
          </article>
          <article className="card">
            <h2>What happens next</h2>
            <ul>
              <li>CRUD forms will use this session key to encrypt secret fields before saving.</li>
              <li>Keyword search will operate on safe local metadata only.</li>
              <li>AI indexing will stay limited to approved `ai_index_text` in later milestones.</li>
            </ul>
          </article>
        </section>
      ) : null}

      {status === "ready" ? (
        <>
          {/* This top ready-state area summarizes the current unlocked vault and sync state. */}
          <section className="grid grid-two vault-panel">
            <article className="card">
              <h2>Vault unlocked</h2>
              <p>
                The local storage and crypto foundation is ready. Record CRUD and encrypted
                field persistence can now build on top of this session state.
              </p>
              <div className="hero-actions">
                <button className="button button-secondary" onClick={handleLock} type="button">
                  Lock vault
                </button>
              </div>
            </article>
            <article className="card">
              <h2>AI sync status</h2>
              <ul>
                <li>{pendingJobCount} AI sync jobs currently queued.</li>
                <li>{isAiSyncRunning ? "Background sync is running." : "Background sync is idle."}</li>
                <li>Local saves do not wait for Pi AI sync to succeed.</li>
              </ul>
            </article>
          </section>

          {/* Configure the Pi wrapper endpoint and inspect queued AI sync work. */}
          <section className="grid grid-two vault-panel">
            <article className="card">
              <h2>Pi AI endpoint</h2>
              <p>
                Only the Pi FastAPI wrapper is used for AI sync. The browser never calls
                Chroma directly.
              </p>
              <form className="vault-form" onSubmit={handleAiEndpointSave}>
                <label>
                  FastAPI base URL
                  <input
                    name="ai_api_base_url"
                    onChange={(event) => setAiApiBaseUrl(event.target.value)}
                    placeholder="http://192.168.x.x:9000"
                    type="url"
                    value={aiApiBaseUrl}
                  />
                </label>
                <div className="hero-actions">
                  <button className="button button-primary" type="submit">
                    Save endpoint
                  </button>
                  <button className="button button-secondary" onClick={handleAiHealthCheck} type="button">
                    Check health
                  </button>
                  <button className="button button-secondary" onClick={() => void runAiSync()} type="button">
                    Retry queued sync
                  </button>
                </div>
              </form>
              {aiStatusMessage ? <p className="feedback">{aiStatusMessage}</p> : null}
            </article>
            <article className="card">
              <h2>Guardrails</h2>
              <ul>
                {readyHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>Only `record_id`, `ai_index_text`, `type`, `category`, and `tags` leave the browser.</li>
                <li>Failed upsert or delete requests stay queued durably in SQLite for retry.</li>
              </ul>
            </article>
          </section>

          {/* Search sits above the record list so it can filter/rank what the user sees. */}
          <section className="grid">
            <VaultSearch
              isSemanticMode={isSemanticMode}
              matchLabel={searchMatchLabel}
              onChange={setSearchQuery}
              onSemanticModeChange={setIsSemanticMode}
              onSemanticSearch={handleSemanticSearch}
              query={searchQuery}
              semanticInFlight={semanticSearchInFlight}
              semanticStatusMessage={semanticStatusMessage}
              totalCount={records.length}
            />
          </section>

          {/* Backup/restore is kept separate so it does not complicate the CRUD form. */}
          <section className="grid">
            <VaultBackup
              backupInFlight={backupInFlight}
              importInFlight={restoreInFlight}
              onBackup={handleBackupExport}
              onImport={handleBackupImport}
            />
          </section>

          {/* The form and the list work together: create/edit on the left, current records on the right. */}
          <section className="grid grid-two vault-panel">
            <VaultRecordForm
              initialValues={recordBeingEdited}
              isSubmitting={recordSubmitInFlight}
              onCancelEdit={() => setRecordBeingEdited(null)}
              onSubmit={handleRecordSubmit}
            />
            <VaultRecordList
              onDelete={handleDeleteRecord}
              onEdit={handleEditRecord}
              onToggleReveal={handleToggleRevealRecord}
              records={visibleRecords}
              revealedSecrets={revealedSecrets}
              revealInFlightId={revealInFlightId}
            />
          </section>

          <p className="section-title">Next milestone</p>
          <section className="grid grid-two">
            <article className="card">
              <h3>Planned next</h3>
              <ul>
                <li>Create, edit, and delete vault records.</li>
                <li>Encrypt account and password fields before storage.</li>
                <li>Mask and reveal secrets explicitly in the UI.</li>
              </ul>
            </article>
            <article className="card">
              <h3>Session notes</h3>
              <ul>
                <li>The in-memory session key is not persisted to local durable storage.</li>
                <li>Network access is still unnecessary for storage and unlock behavior.</li>
                <li>The app remains usable offline for this milestone foundation.</li>
              </ul>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
