from __future__ import annotations

from fastapi import APIRouter

from app.db import get_connection
from app.models import JobItem, JobUpsertRequest
from app.services.jobs_service import delete_job, get_job, list_jobs, upsert_job


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=list[JobItem])
def read_jobs() -> list[JobItem]:
    with get_connection() as connection:
        return list_jobs(connection)


@router.get("/{job_id}", response_model=JobItem)
def read_job(job_id: str) -> JobItem:
    with get_connection() as connection:
        return get_job(connection, job_id)


@router.post("", response_model=JobItem)
def create_or_update_job(payload: JobUpsertRequest) -> JobItem:
    with get_connection() as connection:
        return upsert_job(connection, payload)


@router.delete("/{job_id}", status_code=204)
def remove_job(job_id: str) -> None:
    with get_connection() as connection:
        delete_job(connection, job_id)
