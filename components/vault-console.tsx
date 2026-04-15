"use client";

import { FormEvent, useEffect, useState } from "react";

import { ConnectionStatus } from "@/components/connection-status";
import { VaultRecordForm } from "@/components/vault-record-form";
import { VaultRecordList } from "@/components/vault-record-list";
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
import { getVaultBootstrapState, initializeVault, unlockVault } from "@/lib/vault/settings";

type VaultStatus = "loading" | "setup" | "locked" | "ready" | "unavailable";

const setupHighlights = [
  "Master password is used to derive an AES-GCM key in the browser.",
  "Secret fields remain local and encrypted before IndexedDB persistence.",
  "The derived key stays in memory only for the current session."
];

const readyHighlights = [
  "IndexedDB schema for settings, records, and jobs is initialized.",
  "AES-GCM encryption helpers are ready for record-level secret fields.",
  "The vault is unlocked locally with no network dependency."
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

export function VaultConsole() {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [encryptionVersion, setEncryptionVersion] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [records, setRecords] = useState<VaultRecordSummary[]>([]);
  const [recordSubmitInFlight, setRecordSubmitInFlight] = useState(false);
  const [recordBeingEdited, setRecordBeingEdited] = useState<VaultRecordEditorValues | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Partial<Record<string, VaultRecordSecrets>>>({});
  const [revealInFlightId, setRevealInFlightId] = useState<string | null>(null);

  const refreshRecords = async () => {
    const nextRecords = await listVaultRecords();
    setRecords(nextRecords);
  };

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      try {
        const bootstrap = await getVaultBootstrapState();

        if (cancelled) {
          return;
        }

        setEncryptionVersion(bootstrap.encryptionVersion);
        setAppMode(bootstrap.mode);
        setStatus(bootstrap.initialized ? "locked" : "setup");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFeedback(getErrorMessage(error));
        setStatus("unavailable");
      }
    };

    void loadState();

    return () => {
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
    setSessionKey(null);
    setRecordBeingEdited(null);
    setRevealedSecrets({});
    setFeedback("Vault locked. Your session key has been cleared from memory.");
    setStatus("locked");
  };

  useEffect(() => {
    if (!sessionKey || status !== "ready") {
      return;
    }

    void refreshRecords();
  }, [sessionKey, status]);

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
        const updatedRecord = await updateVaultRecord(recordBeingEdited.id, values, sessionKey);
        setRecords((current) =>
          sortRecordsByUpdatedAt(
            current.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
          )
        );
        setFeedback("Record updated locally.");
      } else {
        const createdRecord = await createVaultRecord(values, sessionKey);
        setRecords((current) => sortRecordsByUpdatedAt([createdRecord, ...current]));
        setFeedback("Record saved locally.");
      }

      setRecordBeingEdited(null);
      setRevealedSecrets({});
      form.reset();
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
      const editorValues = await getVaultRecordEditorValues(id, sessionKey);
      setRecordBeingEdited(editorValues);
      setFeedback("Editing record locally.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await removeVaultRecord(id);
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (recordBeingEdited?.id === id) {
        setRecordBeingEdited(null);
      }
      await refreshRecords();
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
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealInFlightId(id);

    try {
      const secrets = await revealVaultRecordSecrets(id, sessionKey);
      setRevealedSecrets((current) => ({ ...current, [id]: secrets }));
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setRevealInFlightId(null);
    }
  };

  return (
    <main className="shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">SV</div>
          <div className="brand-copy">
            <strong>SecureVault AI</strong>
            <span>Milestone 2: storage, crypto, and master password</span>
          </div>
        </div>
        <ConnectionStatus />
      </header>

      <section className="hero">
        <div className="eyebrow">Browser-only vault foundation</div>
        <h1>Unlock local encryption first.</h1>
        <p>
          This milestone adds the vault bootstrap layer: IndexedDB storage, master-password
          setup, and browser-side AES-GCM key derivation. No secret data leaves the client,
          and the derived key is kept in memory for the active session only.
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
            <p>Checking IndexedDB and local vault settings.</p>
          </article>
        </section>
      ) : null}

      {status === "unavailable" ? (
        <section className="grid">
          <article className="card">
            <h2>Browser support required</h2>
            <p>
              SecureVault AI needs IndexedDB and Web Crypto to initialize the local vault in
              a safe way.
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
              local-only verifier stored in IndexedDB.
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
              <h2>Milestone 2 delivered</h2>
              <ul>
                {readyHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

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
              records={records}
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
                <li>The in-memory session key is not persisted to IndexedDB or localStorage.</li>
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
