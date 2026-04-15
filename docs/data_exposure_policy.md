# Data Exposure Policy

## Never Exposed

- password
- api_key
- token
- secret
- recovery_code
- private_notes (raw)

## Allowed for AI Index

- title
- category
- tags
- user-approved summary
- service description

## Conditional

- account → must be masked (e.g., a***@gmail.com)
- notes → must be summarized or approved

## Rules

- AI must NEVER access encrypted data
- Chroma must NEVER store secrets
- Only ai_index_text is used for semantic search