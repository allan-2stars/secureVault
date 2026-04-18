# Tauri Packaging Readiness

## Purpose

This document defines the recommended runtime model for packaging SecureVault AI as a desktop app with Tauri in a future implementation milestone.

It does not implement Tauri yet. It captures the current architecture, packaging blockers, and the safest path forward.

## Current Runtime Boundary

SecureVault AI is now split into four clear runtime pieces:

1. Frontend UI
- Next.js App Router frontend
- browser-side AES-GCM encryption and key derivation
- in-memory unlocked session key only

2. Local Vault API
- local HTTP boundary for durable vault operations
- record CRUD
- settings CRUD
- jobs queue CRUD
- backup / restore durable boundary

3. SQLite
- durable local source of truth
- stores vault settings, records, and jobs

4. Pi / Chroma Service
- separate semantic search service
- receives only approved `ai_index_text` and safe metadata

## Recommended Tauri Runtime Model

Use Tauri as the desktop shell around the existing split rather than rewriting the storage boundary.

Recommended model:
- Tauri window hosts the frontend UI
- Local Vault API runs as a local sidecar process
- SQLite remains owned by the Local Vault API
- Pi / Chroma remains external and optional

Why this is the recommended model:
- preserves the current working architecture
- avoids mixing SQL and vault persistence directly into the frontend runtime
- keeps crypto, UI, and durable storage concerns separated
- reduces risk compared with collapsing the Local Vault API into custom Tauri commands immediately

## Frontend Serving Strategy

Recommended first packaging path:
- build the frontend as a static export or packaged production web bundle
- serve that bundle inside the Tauri webview
- point `NEXT_PUBLIC_LOCAL_VAULT_API_BASE_URL` at the packaged local API origin

Avoid as a first packaging step:
- embedding a live Next.js dev-style server inside the desktop app
- relying on remote hosted frontend assets

## Local Vault API Packaging Strategy

Recommended first packaging path:
- package Local Vault API as a sidecar process launched by Tauri
- bind only to loopback
- use an app-controlled local port
- pass durable file system paths through environment variables

Required runtime inputs:
- `LOCAL_VAULT_API_HOST`
- `LOCAL_VAULT_API_PORT`
- `LOCAL_VAULT_DB_PATH`
- `LOCAL_VAULT_ALLOW_ORIGINS`

## SQLite File Path Strategy

Do not keep the SQLite file inside the app bundle directory.

Recommended durable location:
- Tauri app data directory
- example target shape:
  - `<app-data>/securevault/securevault.db`

Why:
- writable across restarts and app upgrades
- separate from bundled app files
- predictable backup target

## Backup / Restore Path Strategy

Recommended desktop behavior:
- use native Tauri file dialogs in the future implementation milestone
- export backup JSON to a user-chosen path
- import backup JSON from a user-chosen path

The current backup format can remain unchanged unless a later packaging milestone needs metadata additions.

## App Initialization Model

Recommended startup order in Tauri:
1. resolve app data paths
2. launch Local Vault API sidecar with resolved env vars
3. wait for local API health check
4. load frontend UI
5. frontend reads durable vault settings from Local Vault API

Fail-safe requirement:
- frontend should not assume setup mode if the local API is unavailable
- vault protection must fail closed

## Desktop-Specific Behavior To Plan

Expected future desktop-specific integrations:
- native file dialogs for backup / restore
- app data directory resolution
- sidecar lifecycle management
- health-check wait before loading UI
- optional single-instance behavior

Not required yet:
- auto-update
- system tray
- OS keychain integration
- cloud auth

## Packaging Blockers Identified

1. Frontend build mode for Tauri is not yet chosen
- need to decide between static exported frontend bundle vs another production serving mode

2. Local API sidecar lifecycle is not yet implemented
- need process start, stop, health wait, and logging strategy

3. Port assignment strategy is not yet finalized
- fixed port is simplest for first implementation
- later can move to dynamic assignment if needed

4. Local file paths are not yet wired from desktop runtime
- SQLite and backup paths should come from Tauri-resolved directories

5. Current service worker assumptions may need review in desktop mode
- desktop webview caching may not need the same offline shell behavior as browser deployment

## Minimal Code / Config Adjustments Recommended Before Implementation

These are readiness-level, not packaging implementation tasks:
- keep frontend configured through environment variables
- keep Local Vault API configured entirely through environment variables
- keep SQLite path externalized through `LOCAL_VAULT_DB_PATH`
- keep API boundary stable instead of mixing persistence into the frontend

## Recommended Milestone 8 Scope

Milestone 8 should focus on implementation of:
- Tauri project scaffold
- frontend bundle loading inside Tauri
- Local Vault API sidecar launch
- desktop app data path wiring
- packaged runtime health check and startup sequence

Milestone 8 should not expand into:
- feature redesign
- sync mode
- Pi / Chroma redesign
- storage model rewrite

## Readiness Summary

SecureVault AI is ready for a focused Tauri packaging implementation milestone because:
- durable storage boundary is explicit
- SQLite is already the source of truth
- Local Vault API is already separated from the UI
- backup / restore and unlock flow already use the durable boundary
- Pi / Chroma remains isolated from the packaging decision
