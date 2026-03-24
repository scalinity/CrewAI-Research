from __future__ import annotations

import time
from typing import Literal

from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    type: str
    timestamp: float = Field(default_factory=time.time)
    run_id: str = ""


# --- Crew lifecycle ---


class CrewStartEvent(BaseEvent):
    type: Literal["crew_start"] = "crew_start"
    agent_names: list[str]
    topic: str


class CrewCompleteEvent(BaseEvent):
    type: Literal["crew_complete"] = "crew_complete"
    final_output: str
    total_tokens: int
    total_cost_usd: float
    total_duration_ms: float
    tasks_completed: int


class ErrorEvent(BaseEvent):
    type: Literal["error"] = "error"
    agent_name: str | None = None
    error_message: str
    error_type: str


# --- Agent lifecycle ---


class AgentStartEvent(BaseEvent):
    type: Literal["agent_start"] = "agent_start"
    agent_name: str
    agent_role: str
    task_description: str


# --- Step events (from step_callback) ---


class ThoughtEvent(BaseEvent):
    type: Literal["thought"] = "thought"
    agent_name: str
    thought: str


class ToolCallEvent(BaseEvent):
    type: Literal["tool_call"] = "tool_call"
    agent_name: str
    tool_name: str
    tool_input: dict


class ToolResultEvent(BaseEvent):
    type: Literal["tool_result"] = "tool_result"
    agent_name: str
    tool_name: str
    result_preview: str
    duration_ms: float


class DelegationEvent(BaseEvent):
    type: Literal["delegation"] = "delegation"
    from_agent: str
    to_agent: str
    reason: str


# --- Task events (from task_callback) ---


class TaskCompleteEvent(BaseEvent):
    type: Literal["task_complete"] = "task_complete"
    task_description: str
    agent_name: str
    output_preview: str
    tokens_used: int | None = None
    duration_ms: float


# --- Metrics ---


class TokenUsageEvent(BaseEvent):
    type: Literal["token_usage"] = "token_usage"
    agent_name: str
    input_tokens: int
    output_tokens: int
    cumulative_total: int
    estimated_cost_usd: float


# --- Connection ---


class HeartbeatEvent(BaseEvent):
    type: Literal["heartbeat"] = "heartbeat"


class RunStateSnapshot(BaseEvent):
    type: Literal["run_state_snapshot"] = "run_state_snapshot"
    status: str
    agents: list[dict]
    tasks: list[dict]
    metrics: dict
    recent_thoughts: list[dict]
    topic: str = ""
