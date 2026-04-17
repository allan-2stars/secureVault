"use client";

import { FormEvent, useState } from "react";

import type { VaultRecordEditorValues } from "@/lib/vault/records";

type VaultRecordFormProps = {
  initialValues?: VaultRecordEditorValues | null;
  isSubmitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function VaultRecordForm({
  initialValues,
  isSubmitting,
  onCancelEdit,
  onSubmit
}: VaultRecordFormProps) {
  // If initialValues exists, we are editing an existing record instead of creating a new one.
  const isEditing = Boolean(initialValues);
  // This controls whether the password field is shown as plain text or masked.
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <article className="card">
      <h2>{isEditing ? "Edit record" : "Create record"}</h2>
      <p>
        Secret fields are encrypted before storage. Metadata stays local for future keyword
        search and safe indexing rules.
      </p>
      <form
        className="vault-form"
        // Changing the key forces the form to remount when a different record is selected.
        // That makes defaultValue fields refresh correctly for edit mode.
        key={initialValues?.id ?? "new-record"}
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="form-grid">
          <label>
            Title
            <input defaultValue={initialValues?.title ?? ""} name="title" required type="text" />
          </label>
          <label>
            Type
            <input
              defaultValue={initialValues?.type ?? "login"}
              name="type"
              placeholder="login, api, subscription"
              required
              type="text"
            />
          </label>
          <label>
            Category
            <input
              defaultValue={initialValues?.category ?? ""}
              name="category"
              placeholder="productivity, finance, infra"
              type="text"
            />
          </label>
          <label>
            Tags
            <input
              defaultValue={initialValues?.tags ?? ""}
              name="tags"
              placeholder="comma, separated, tags"
              type="text"
            />
          </label>
          <label>
            Account
            <input
              autoComplete="username"
              defaultValue={initialValues?.account ?? ""}
              name="account"
              type="text"
            />
          </label>
          <label>
            Password / secret
            <div className="password-input-row">
              <input
                autoComplete="current-password"
                defaultValue={initialValues?.password ?? ""}
                name="password"
                // Toggle between visible text and masked password while typing.
                type={isPasswordVisible ? "text" : "password"}
              />
              <button
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="form-grid-span">
            URL
            <input
              defaultValue={initialValues?.url ?? ""}
              name="url"
              placeholder="https://example.com"
              type="url"
            />
          </label>
          <label className="form-grid-span">
            Notes summary
            <textarea
              defaultValue={initialValues?.notes_summary ?? ""}
              name="notes_summary"
              placeholder="Safe summary only. This may later support keyword search."
              rows={3}
            />
          </label>
          <label className="form-grid-span">
            Private notes
            <textarea
              defaultValue={initialValues?.private_notes ?? ""}
              name="private_notes"
              placeholder="Sensitive notes stay encrypted locally."
              rows={4}
            />
          </label>
        </div>

        <div className="hero-actions">
          {/* The main submit button handles both create and edit flows. */}
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create record"}
          </button>
          {isEditing ? (
            // Cancel only appears in edit mode so the user can go back to "create" mode.
            <button className="button button-secondary" onClick={onCancelEdit} type="button">
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </article>
  );
}
