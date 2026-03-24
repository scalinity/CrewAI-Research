from __future__ import annotations

import asyncio
import logging
import threading
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_HISTORY_ENTRIES = 20
GENERATE_TOPIC_TIMEOUT = 30  # seconds

# Track active crew task and its cancellation event
_active_crew_task: asyncio.Task | None = None
_active_cancel_event: threading.Event | None = None
_run_lock = asyncio.Lock()

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
    global _active_crew_task, _active_cancel_event

    async with _run_lock:
        if manager.run_state.status == "running":
            raise HTTPException(status_code=409, detail="A run is already active")

        run_id = str(uuid4())
        cancel_event = threading.Event()

        # Deferred import: breaks circular dependency (crew_factory -> websocket_manager -> this module)
        from ..crew.crew_factory import execute_crew

        _active_cancel_event = cancel_event
        _active_crew_task = asyncio.create_task(
            execute_crew(req.topic, run_id, manager, req.model, req.thinking_level, cancel_event=cancel_event),
            name=f"crew_run_{run_id}",
        )

        def _on_done(task: asyncio.Task) -> None:
            global _active_crew_task, _active_cancel_event
            # Only clear the reference if it still points to THIS task,
            # otherwise a newer run's task would be incorrectly nullified.
            if _active_crew_task is task:
                _active_crew_task = None
                _active_cancel_event = None
            if task.cancelled():
                logger.info("Crew task %s was cancelled", task.get_name())
            elif exc := task.exception():
                logger.error("Crew task %s raised unhandled: %s", task.get_name(), exc)

        _active_crew_task.add_done_callback(_on_done)

    return {"run_id": run_id, "status": "started"}


@router.get("/api/status")
async def get_status() -> dict:
    rs = manager.run_state
    if rs.status == "idle":
        return {"status": "idle"}
    return {"run_id": rs.run_id, "status": rs.status, "topic": rs.topic}


@router.post("/api/cancel")
async def cancel_run() -> dict:
    global _active_crew_task

    if manager.run_state.status not in ("running", "cancelled"):
        raise HTTPException(status_code=400, detail="No active run to cancel")
    manager.update_run_state(status="cancelled")
    # Signal the worker thread to abort at the next step callback
    if _active_cancel_event is not None:
        _active_cancel_event.set()
    if _active_crew_task and not _active_crew_task.done():
        _active_crew_task.cancel()
    return {"status": "cancelled"}


class GenerateTopicRequest(BaseModel):
    idea: str = Field(min_length=1, max_length=300)


_generate_llm: object | None = None


@router.post("/api/generate-topic")
async def generate_topic(req: GenerateTopicRequest) -> dict:
    from crewai import LLM

    from ..config import settings

    global _generate_llm
    if _generate_llm is None:
        _generate_llm = LLM(model=settings.MODEL_NAME)

    try:
        prompt = (
            "Given this rough idea, generate a specific, well-scoped research topic. "
            "Return ONLY the topic as a single sentence, nothing else. No quotes, no explanation.\n\n"
            f"Idea: {req.idea}"
        )
        result = await asyncio.wait_for(
            asyncio.to_thread(_generate_llm.call, [{"role": "user", "content": prompt}]),  # type: ignore[union-attr]
            timeout=GENERATE_TOPIC_TIMEOUT,
        )
        topic = result.strip().strip('"').strip("'")
        return {"topic": topic}
    except asyncio.TimeoutError:
        logger.error("Topic generation timed out after %ds", GENERATE_TOPIC_TIMEOUT)
        _generate_llm = None
        raise HTTPException(status_code=504, detail="Topic generation timed out")
    except Exception as e:
        logger.exception("Topic generation failed: %s", e)
        _generate_llm = None  # reset on failure so next call re-creates
        raise HTTPException(status_code=500, detail="Failed to generate topic")


@router.get("/api/history")
async def get_history() -> list[dict]:
    logs_dir = Path("logs")
    if not logs_dir.exists():
        return []
    # Use heapq to avoid sorting all files when only the top N are needed.
    # With many log files, this is O(n log k) instead of O(n log n).
    import heapq
    files = list(logs_dir.glob("*.jsonl"))
    top_files = heapq.nlargest(MAX_HISTORY_ENTRIES, files, key=lambda f: f.name)
    return [{"run_id": f.stem, "file": f.name, "size_bytes": f.stat().st_size} for f in top_files]
