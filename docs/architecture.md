# Architecture Overview

## Layers

### Frontend (Next.js)
- UI
- State management
- Encryption logic
- IndexedDB access

---

### Local Storage
- IndexedDB stores encrypted data

---

### Crypto Layer
- AES-GCM via Web Crypto API
- Key derived from master password

---

### AI Layer
- Pi-hosted Chroma
- Stores only ai_index_text

---

## Data Flow

### Add Record
User → Encrypt → Store → Generate AI Index → Send to Chroma

### Search
User query → embedding → Chroma → record ids → local decrypt → display

---

## Fallback
If Chroma unavailable:
- Use keyword search only