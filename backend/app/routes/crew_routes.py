from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_HISTORY_ENTRIES = 20

ALLOWED_MODELS = {
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4-nano",
    "openai/gpt-5.4",
    "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-6",
    "google/gemini-3.1-pro-preview",
    "google/gemini-3-flash-preview",
    "google/gemini-3.1-flash-lite-preview",
}

ALLOWED_THINKING_LEVELS = {"off", "low", "medium", "high", "max"}


class RunRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    model: str | None = None
    thinking_level: str = "off"

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_MODELS:
            raise ValueError(f"model must be one of: {sorted(ALLOWED_MODELS)}")
        return v

    @field_validator("thinking_level")
    @classmethod
    def validate_thinking_level(cls, v: str) -> str:
        if v not in ALLOWED_THINKING_LEVELS:
            raise ValueError(f"thinking_level must be one of: {sorted(ALLOWED_THINKING_LEVELS)}")
        return v


@router.post("/api/run")
async def start_run(req: RunRequest) -> dict:
    if manager.run_state.status == "running":
        raise HTTPException(status_code=409, detail="A run is already active")

    run_id = str(uuid4())

    from ..crew.crew_factory import execute_crew

    asyncio.create_task(execute_crew(req.topic, run_id, manager, req.model, req.thinking_level))
    return {"run_id": run_id, "status": "started"}


@router.get("/api/status")
async def get_status() -> dict:
    rs = manager.run_state
    if rs.status == "idle":
        return {"status": "idle"}
    return {"run_id": rs.run_id, "status": rs.status, "topic": rs.topic}


@router.post("/api/cancel")
async def cancel_run() -> dict:
    if manager.run_state.status != "running":
        raise HTTPException(status_code=400, detail="No active run to cancel")
    manager.update_run_state(status="cancelled")
    return {"status": "cancelled"}


@router.get("/api/history")
async def get_history() -> list[dict]:
    logs_dir = Path("logs")
    if not logs_dir.exists():
        return []
    runs = []
    for f in sorted(logs_dir.glob("*.jsonl"), reverse=True):
        runs.append({"run_id": f.stem, "file": f.name, "size_bytes": f.stat().st_size})
    return runs[:MAX_HISTORY_ENTRIES]
