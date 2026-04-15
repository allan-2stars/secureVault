# Acceptance Criteria

## Security
- No plaintext secrets stored
- No secrets sent to Chroma
- No secrets in logs

## Reliability
- Works after refresh
- Works offline (CRUD + keyword search)
- Chroma failure does not break app

## Search
- Keyword search works locally
- Semantic search uses AI index only

## UX
- Secrets hidden by default
- Explicit reveal
- Backup & restore available