# Chroma API Contract (Pi)

## Base URL
	http://<your-pi>/api
---

## POST /index/upsert

Request:
{
  "record_id": "uuid",
  "ai_index_text": "string",
  "type": "string",
  "category": "string",
  "tags": ["string"]
}

---

## POST /index/delete

Request:
{
  "record_id": "uuid"
}

---

## POST /index/query

Request:
{
  "query": "string",
  "top_k": 5
}

Response:
{
  "results": [
    { "record_id": "uuid", "score": 0.92 }
  ]
}