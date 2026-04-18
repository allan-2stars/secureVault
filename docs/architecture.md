# 1. System Overview

SecureVault AI is a **local-first, privacy-preserving vault system** with optional AI-assisted search powered by a **user-controlled Chroma instance (Pi)**.

The post-migration architecture separates:

- frontend UI and in-memory session state
- Local Vault API as the local durable boundary
- SQLite as the source of truth for vault data
- Pi/Chroma semantic search as a separate optional service

The architecture strictly enforces **data isolation**:

- Secrets never leave the client
- AI operates only on derived, non-sensitive index data

---

# 2. High-Level Architecture Diagram


---
## Logical Structure

┌────────────────────────────┐  
│        Frontend (Next.js)  │  
│────────────────────────────│  
│ UI Layer                   │  
│ Vault Logic                │  
│ Search Engine              │  
│ Crypto Module              │  
│ In-memory Session State    │  
└────────────┬───────────────┘  
             │  
             │ Local Durable API  
             ▼  
┌────────────────────────────┐  
│     Local Vault API        │  
│────────────────────────────│  
│ Settings CRUD              │  
│ Record CRUD                │  
│ Jobs Queue CRUD            │  
│ Backup / Restore Boundary  │  
└────────────┬───────────────┘  
             │  
             ▼  
┌────────────────────────────┐  
│         SQLite             │  
│────────────────────────────│  
│ Durable Vault Settings     │  
│ Durable Records            │  
│ Durable Retry Jobs         │  
└────────────┬───────────────┘  
             │  
             │ (AI Index Only)  
             ▼  
┌────────────────────────────┐  
│     Pi Server (Chroma)     │  
│────────────────────────────│  
│ Embedding + Vector Search  │  
│ Stores: ai_index_text      │  
│ No secrets stored          │  
└────────────────────────────┘

---

# 3. Data Layer Architecture

---

## 3.1 Data Separation Model

┌────────────────────────────┐  
│ Layer 1: Secret Data       │  
│----------------------------│  
│ password                   │  
│ api_key                    │  
│ token                      │  
│ private_notes              │  
│ 🔒 encrypted               │  
│ 🚫 never leaves client     │  
└────────────────────────────┘  
  
┌────────────────────────────┐  
│ Layer 2: Metadata          │  
│----------------------------│  
│ title                      │  
│ tags                       │  
│ category                   │  
│ url                        │  
│ account_hint               │  
│ 🟡 local use only          │  
└────────────────────────────┘  
  
┌────────────────────────────┐  
│ Layer 3: AI Index          │  
│----------------------------│  
│ ai_index_text              │  
│ 🟢 safe for vector search  │  
│ 🌐 sent to Pi              │  
└────────────────────────────┘

---

# 4. Core Data Flows

---

## 4.1 Add Record Flow

User Input  
   ↓  
Form Processing  
   ↓  
Split Data Layers  
   ↓  
Encrypt Secret Data (AES-GCM)  
   ↓  
Store via Local Vault API → SQLite  
   ↓  
Generate AI Index Text  
   ↓  
Send to Chroma (Pi)

---

## 4.2 Search Flow

### Keyword Search (Local)

User Input  
   ↓  
Local Search Engine  
   ↓  
SQLite-backed local query  
   ↓  
Return Results

---

### AI Semantic Search

User Query  
   ↓  
Send Query → Pi (Chroma)  
   ↓  
Vector Similarity Search  
   ↓  
Return Record IDs  
   ↓  
Fetch from Local Vault API  
   ↓  
Decrypt (if needed)  
   ↓  
Display Results

---

## 4.3 Reveal Secret Flow

User Click "Reveal"  
   ↓  
Check Unlock State  
   ↓  
Decrypt Field  
   ↓  
Display Temporarily

---

## 4.4 Backup Flow

User Export  
   ↓  
Serialize SQLite-backed snapshot  
   ↓  
Keep Encrypted Fields  
   ↓  
Generate JSON File

---

## 4.5 Restore Flow

Import File  
   ↓  
Validate Structure  
   ↓  
Restore through Local Vault API → SQLite  
   ↓  
Trigger AI Index Rebuild

---

# 5. Component Architecture

---

## 5.1 Frontend Modules

### UI Layer

- forms
- record list
- search interface
- settings

---

### Vault Engine

- record CRUD
- validation
- data normalization

---

### Crypto Module

- key derivation
- encrypt/decrypt
- session unlock

---

### Storage Layer

- Local Vault API client
- SQLite-backed repositories

---

### AI Module

- AI index generator
- Chroma API client
- SQLite-backed retry queue

---

# 6. Chroma (Pi) Integration

---

## 6.1 Responsibilities

Chroma is used ONLY for:

- storing vector embeddings
- semantic search

---

## 6.2 Data Stored

{  
  "record_id": "uuid",  
  "ai_index_text": "string",  
  "metadata": {  
    "tags": [],  
    "category": ""  
  }  
}

---

## 6.3 Data NOT Stored

- passwords
- tokens
- encrypted fields
- full notes

---

# 7. Failure & Fallback Handling

---

## 7.1 Chroma Offline

System behavior:

- AI search disabled
- keyword search still works
- CRUD unaffected

---

## 7.2 Index Sync Failure

Fail → Add job to queue → Retry later

---

## 7.3 Decryption Failure

- show error
- do not crash
- keep data intact

---

# 8. Security Architecture

---

## 8.1 Encryption Flow

Master Password  
   ↓  
Key Derivation (PBKDF2)  
   ↓  
AES-GCM Key  
   ↓  
Encrypt / Decrypt

---

## 8.2 Secret Handling Rules

- never logged
- never sent over network
- decrypted only in memory
- cleared after use

---

# 9. Offline Capability

---

## Supported Offline

- unlock vault
- view/edit records
- keyword search
- backup/export

---

## Not Supported Offline

- AI semantic search (requires Pi)

---

# 10. Future Extension (Sync Mode)

---

## Planned Changes

Client  
  ↓  
Encrypt Data  
  ↓  
Cloud Storage  
  ↓  
Multi-device access

---

## AI in Sync Mode

- AI still uses index layer
- secrets remain encrypted

---

# 11. Key Design Principles

---

## Privacy First

No secrets leave the client

---

## Local First

Works without network

---

## AI Optional

System usable without AI

---

## Modular Design

Each layer independent

---

# 🔚 END OF architecture.md
