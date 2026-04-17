from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SettingItem(BaseModel):
    key: str = Field(..., min_length=1)
    value: Any
    updated_at: str


class SettingUpsertRequest(BaseModel):
    key: str = Field(..., min_length=1)
    value: Any


class JobPayload(BaseModel):
    record_id: str = Field(..., min_length=1)
    ai_index_text: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    type: str | None = None


class JobItem(BaseModel):
    id: str = Field(..., min_length=1)
    type: Literal["index_upsert", "index_delete"]
    status: Literal["pending", "running", "failed"]
    payload: JobPayload
    retry_count: int = Field(ge=0)
    last_attempt: str | None = None
    created_at: str
    updated_at: str


class JobUpsertRequest(BaseModel):
    id: str = Field(..., min_length=1)
    type: Literal["index_upsert", "index_delete"]
    status: Literal["pending", "running", "failed"]
    payload: JobPayload
    retry_count: int = Field(default=0, ge=0)
    last_attempt: str | None = None


class RecordItem(BaseModel):
    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    account_hint: str
    account_encrypted: str
    password_encrypted: str
    url: str
    notes_summary: str
    private_notes_encrypted: str
    tags_json: str
    category: str
    ai_index_text: str
    index_status: Literal["pending", "synced"]
    created_at: str
    updated_at: str


class RecordUpsertRequest(RecordItem):
    pass
