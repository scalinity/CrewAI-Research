from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Callable

from ..event_types import (
    AgentStartEvent,
    TaskCompleteEvent,
    ThoughtEvent,
    TokenUsageEvent,
    ToolCallEvent,
    ToolResultEvent,
)

if TYPE_CHECKING:
    from ..utils.token_tracker import TokenTracker
    from ..websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)

# Truncation limits for event payloads
PREVIEW_MAX_LEN = 200
RESULT_PREVIEW_MAX_LEN = 500
FALLBACK_TEXT_MAX_LEN = 1000


def make_step_callback_factory(
    manager: ConnectionManager,
    run_id: str,
    token_tracker: TokenTracker,
    task_start_times: dict[str, float] | None = None,
) -> Callable[[str], Callable]:
    seen_agents: set[str] = set()
    task_descriptions: dict[str, str] = {}
    if task_start_times is None:
        task_start_times = {}

    def factory(agent_name: str) -> Callable:
        def step_callback(step_output: object) -> None:
            try:
                _handle_step(step_output, agent_name, manager, run_id, token_tracker, seen_agents, task_descriptions, task_start_times)
            except Exception as e:
                logger.exception("Error in step_callback for %s: %s", agent_name, e)

        return step_callback

    return factory


def _handle_step(
    step_output: object,
    agent_name: str,
    manager: ConnectionManager,
    run_id: str,
    token_tracker: TokenTracker,
    seen_agents: set[str],
    task_descriptions: dict[str, str],
    task_start_times: dict[str, float] | None = None,
) -> None:
    if agent_name not in seen_agents:
        seen_agents.add(agent_name)
        task_desc = getattr(step_output, "task", None)
        if task_desc:
            task_desc = str(task_desc)
            if task_start_times is not None:
                task_start_times.setdefault(task_desc, time.time())
        else:
            task_desc = task_descriptions.get(agent_name, "Processing...")
        manager.sync_broadcast(
            AgentStartEvent(run_id=run_id, agent_name=agent_name, agent_role=agent_name, task_description=task_desc)
        )
        manager.update_run_state(thought={"type": "agent_start", "agent_name": agent_name})

    thought = getattr(step_output, "thought", None) or getattr(step_output, "log", None)
    tool = getattr(step_output, "tool", None)
    tool_input = getattr(step_output, "tool_input", None)
    result = getattr(step_output, "result", None)

    if tool and result is not None:
        event = ToolResultEvent(
            run_id=run_id,
            agent_name=agent_name,
            tool_name=str(tool),
            result_preview=str(result)[:RESULT_PREVIEW_MAX_LEN],
            duration_ms=0,
        )
        manager.update_run_state(
            thought={"type": "tool_result", "agent_name": agent_name, "tool_name": str(tool), "preview": str(result)[:PREVIEW_MAX_LEN]}
        )
    elif tool:
        event = ToolCallEvent(
            run_id=run_id,
            agent_name=agent_name,
            tool_name=str(tool),
            tool_input=coerce_to_dict(tool_input),
        )
        manager.update_run_state(
            thought={"type": "tool_call", "agent_name": agent_name, "tool_name": str(tool)}
        )
    elif thought:
        event = ThoughtEvent(run_id=run_id, agent_name=agent_name, thought=str(thought))
        manager.update_run_state(
            thought={"type": "thought", "agent_name": agent_name, "preview": str(thought)[:PREVIEW_MAX_LEN]}
        )
    else:
        text = str(step_output)
        if len(text) > FALLBACK_TEXT_MAX_LEN:
            text = text[:FALLBACK_TEXT_MAX_LEN] + "..."
        event = ThoughtEvent(run_id=run_id, agent_name=agent_name, thought=text)
        manager.update_run_state(thought={"type": "thought", "agent_name": agent_name, "preview": text[:PREVIEW_MAX_LEN]})

    text_for_estimate = str(thought or result or step_output)
    token_tracker.add_estimate(agent_name, max(len(text_for_estimate) // 4, 1))
    manager.sync_broadcast(
        TokenUsageEvent(
            run_id=run_id,
            agent_name=agent_name,
            input_tokens=0,
            output_tokens=0,
            cumulative_total=token_tracker.cumulative_total,
            estimated_cost_usd=token_tracker.total_cost,
        )
    )

    manager.sync_broadcast(event)


def coerce_to_dict(val: object) -> dict:
    if isinstance(val, dict):
        return val
    if val is None:
        return {}
    try:
        return {"input": str(val)}
    except Exception:
        return {}


def make_task_callback(
    manager: ConnectionManager,
    run_id: str,
    token_tracker: TokenTracker,
    task_start_times: dict[str, float] | None = None,
) -> Callable:
    _task_start_times = task_start_times if task_start_times is not None else {}

    def task_callback(task_output: object) -> None:
        try:
            description = getattr(task_output, "description", "") or ""
            raw = getattr(task_output, "raw", "") or str(task_output)
            agent = getattr(task_output, "agent", "") or ""

            duration_ms = 0.0
            if description in _task_start_times:
                duration_ms = (time.time() - _task_start_times[description]) * 1000

            token_data = getattr(task_output, "token_usage", None)
            if token_data:
                token_tracker.snap_to_real(token_data)

            manager.sync_broadcast(
                TaskCompleteEvent(
                    run_id=run_id,
                    task_description=description[:PREVIEW_MAX_LEN],
                    agent_name=str(agent),
                    output_preview=raw[:RESULT_PREVIEW_MAX_LEN],
                    tokens_used=token_tracker.cumulative_total,
                    duration_ms=duration_ms,
                )
            )

            manager.sync_broadcast(
                TokenUsageEvent(
                    run_id=run_id,
                    agent_name=str(agent),
                    input_tokens=0,
                    output_tokens=0,
                    cumulative_total=token_tracker.cumulative_total,
                    estimated_cost_usd=token_tracker.total_cost,
                )
            )

            manager.update_run_state(
                thought={
                    "type": "task_complete",
                    "agent_name": str(agent),
                    "description": description[:PREVIEW_MAX_LEN],
                    "preview": raw[:PREVIEW_MAX_LEN],
                }
            )
        except Exception as e:
            logger.exception("Error in task_callback: %s", e)

    return task_callback
