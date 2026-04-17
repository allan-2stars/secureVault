# 1. Product Overview

## 1.1 Product Name

**SecureVault AI** (working name)

---

## 1.2 Vision

SecureVault AI is a **privacy-first, local-first web application** designed to help users manage sensitive digital information such as:

- website accounts
- passwords
- API keys and tokens
- subscriptions
- personal confidential records

The product enables fast retrieval through both **traditional search and AI-assisted semantic search**, while ensuring that **sensitive data remains under user control and is never exposed to external systems**.

---

## 1.3 MVP Goal

Deliver a **single-user web application** that:

- securely stores sensitive records locally
- allows fast and flexible search
- supports AI-assisted semantic retrieval using safe data only
- operates without requiring cloud infrastructure

---

# 2. Target Users

## Primary Users

- developers managing API credentials
- privacy-conscious individuals
- power users with many online accounts

## Secondary Users

- small business owners managing multiple services

---

# 3. Product Scope

---

## 3.1 In Scope (MVP v1)

### Core Vault

- create, edit, delete records
- structured data fields
- tags and categories
- timestamp tracking
- secret masking and reveal

---

### Search

- keyword search (local)
- AI semantic search (via Pi + Chroma)

---

### Security

- master password unlock
- encrypted sensitive data storage

---

### Subscription Support

- manual subscription tracking

---

### Backup

- export encrypted data
- restore from backup

---

## 3.2 Out of Scope (MVP v1)

- cloud sync
- login system
- mobile app
- automatic subscription detection
- email scanning
- payment features
- admin dashboard
- browser autofill

---

# 4. Core Architecture

---

## 4.1 Data Layer Separation (Critical)

The system MUST separate data into three layers:

---

### Layer 1 — Secret Data

Highly sensitive information:

- password
- api_key
- token
- recovery_code
- private_notes

**Rules:**

- must be encrypted
- stored locally only
- never sent to AI or vector database

---

### Layer 2 — Metadata

Low to medium sensitivity:

- title
- category
- tags
- url
- account (masked)
- notes_summary

**Rules:**

- stored locally
- used for keyword search
- partially visible in UI

---

### Layer 3 — AI Index

AI-specific search representation:

Example:

PlayStation gaming subscription console purchase entertainment

**Generated from:**

- metadata
- user-approved summary
- optional system-generated description

**Rules:**

- must NOT contain secrets
- may be sent to Chroma
- used for semantic search only

---

# 5. Data Exposure Policy

---

## 5.1 Never Exposed

The following data MUST NEVER leave the local decrypted environment:

- password
- api_key
- token
- secret
- recovery_code
- raw private notes

---

## 5.2 Allowed for AI Processing

- title
- tags
- category
- safe summaries
- service descriptions

---

## 5.3 Conditional Data

- account → must be masked (e.g., a***@gmail.com)
- notes → must be summarized or user-approved

---

## 5.4 AI Constraints

- AI can only access AI Index (Layer 3)
- AI must not access encrypted fields
- AI must not reconstruct sensitive information

---

# 6. Product Modes

---

## 6.1 Privacy Mode (MVP Default)

### Characteristics

- fully local storage (IndexedDB)
- no cloud usage
- no login system
- works offline

---

### AI Behavior

- AI Index sent only to user-controlled Pi (Chroma)
- no third-party AI exposure

---

### Data Flow

Frontend → (AI Index only) → Pi (Chroma)  
Frontend ← search results ← Pi

---

## 6.2 Sync Mode (Future)

### Characteristics

- multi-device support
- user login required
- cloud storage enabled

---

### Data Storage

|Data Type|Storage|
|---|---|
|Secret Data|encrypted client-side|
|Metadata|partially stored|
|AI Index|stored or embedded|

update:
IndexedDB is acceptable for MVP prototyping only and must not be treated as the long-term durable storage layer. A future architecture revision should migrate persistent vault storage to a local database such as SQLite, while keeping the browser layer focused on UI and transient session state.
---

### AI Behavior

- AI only accesses AI Index
- secrets remain encrypted

---

# 7. Functional Requirements

---

## 7.1 Record Management

Users can:

- create records
- edit records
- delete records
- assign tags
- assign categories

---

## 7.2 Record Fields

Each record includes:

- id
- type
- title
- account_hint
- account_encrypted
- password_encrypted
- url
- notes_summary
- private_notes_encrypted
- tags
- category
- created_at
- updated_at

---

## 7.3 Subscription Fields (Optional)

- billing_amount
- billing_cycle
- next_renewal
- status

---

## 7.4 Search System

---

### Keyword Search

- local
- fast
- works offline

---

### AI Semantic Search

- uses AI Index only
- query → embedding → Chroma → record ids
- fallback to keyword search if unavailable

---

## 7.5 Secret Handling

- hidden by default
- reveal on user action
- optional partial reveal
- copy supported
- optional auto-hide

---

## 7.6 Backup & Restore

- export encrypted JSON
- import backup
- rebuild AI index after restore

---

# 8. AI Search Architecture

---

## 8.1 Current Implementation

- Chroma runs on user-controlled Pi
- stores AI Index only

---

## 8.2 Data in Chroma

Allowed:

- record_id
- ai_index_text
- tags/category (optional)

---

Not allowed:

- secrets
- full notes
- encrypted data

---

## 8.3 Index Lifecycle

- create → generate AI index
- update → re-index
- delete → remove index
- failure → retry queue

---

# 9. Non-Functional Requirements

---

## Security

- no plaintext secrets
- no secret leakage
- encryption required

---

## Performance

- search < 200ms
- smooth UI interactions

---

## Reliability

- no data loss on refresh
- retry failed index sync

---

## Offline Capability

- full CRUD offline
- keyword search offline
- AI search optional

---

## Privacy

- user controls all data
- AI usage transparent

---

# 10. Risks & Challenges

---

## Encryption Complexity

- key derivation
- no password recovery

---

## AI vs Privacy Tradeoff

- strict filtering may reduce AI usefulness

---

## Pi Dependency

- AI search unavailable if Pi offline

---

## Sync Mode Complexity

- encryption + multi-device consistency

---

# 11. Success Criteria

---

The MVP is successful if:

- users can find records within seconds
- sensitive data remains protected
- system works offline
- no critical security flaws
- users trust it more than third-party vault apps

---

# END OF PRD_v1_1