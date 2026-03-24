from __future__ import annotations

import asyncio
import logging
import threading
import time
from typing import TYPE_CHECKING

from crewai import Crew, LLM, Process

from ..config import get_thinking_params, settings
from ..event_types import AgentStartEvent, CrewCompleteEvent, CrewStartEvent, ErrorEvent
from ..utils.event_logger import EventLogger
from ..utils.token_tracker import TokenTracker
from .agents import create_agents
from .callbacks import CrewCancelledError, make_step_callback_factory, make_task_callback
from .tasks import create_tasks
from .tool_listener import ToolEventListener
from .tools import create_tools

if TYPE_CHECKING:
    from ..websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)

AGENT_NAMES = ["Senior Research Analyst", "Technical Writer", "Quality Reviewer"]


async def execute_crew(
    topic: str,
    run_id: str,
    manager: ConnectionManager,
    model_override: str | None = None,
    thinking_level: str = "off",
    cancel_event: threading.Event | None = None,
) -> None:
    model_name = model_override or settings.MODEL_NAME
    event_logger = EventLogger(run_id)
    manager.set_event_logger(event_logger)

    token_tracker = TokenTracker(model_name)

    thinking_params = get_thinking_params(model_name, thinking_level)
    llm = LLM(model=model_name, max_completion_tokens=4096, **thinking_params)
    logger.info("Using model=%s thinking_level=%s params=%s", model_name, thinking_level, thinking_params)

    task_start_times: dict[str, float] = {}
    cb_factory = make_step_callback_factory(
        manager, run_id, token_tracker, task_start_times,
        pre_started_agents={AGENT_NAMES[0]}, cancel_event=cancel_event,
    )
    task_cb = make_task_callback(manager, run_id, token_tracker, task_start_times)

    tools = create_tools()
    researcher, writer, editor = create_agents(llm, tools, cb_factory)
    research_task, writing_task, review_task = create_tasks(researcher, writer, editor, topic)

    crew = Crew(
        agents=[researcher, writer, editor],
        tasks=[research_task, writing_task, review_task],
        process=Process.sequential,
        verbose=True,
        memory=False,
        max_rpm=30,
        task_callback=task_cb,
    )

    manager.sync_broadcast(
        CrewStartEvent(
            run_id=run_id,
            agent_names=AGENT_NAMES,
            topic=topic,
        )
    )

    manager.update_run_state(
        status="running",
        run_id=run_id,
        topic=topic,
        agents=[
            {"name": AGENT_NAMES[0], "status": "thinking"},
            {"name": AGENT_NAMES[1], "status": "idle"},
            {"name": AGENT_NAMES[2], "status": "idle"},
        ],
        tasks=[
            {"description": "Research", "agent": AGENT_NAMES[0], "status": "active"},
            {"description": "Write", "agent": AGENT_NAMES[1], "status": "pending"},
            {"description": "Review", "agent": AGENT_NAMES[2], "status": "pending"},
        ],
        metrics={"totalTokens": 0, "estimatedCost": 0.0},
    )

    # Emit AgentStartEvent immediately so the UI shows the first agent as active
    # before any step callbacks fire (CrewAI doesn't callback until after the first LLM response)
    manager.sync_broadcast(
        AgentStartEvent(
            run_id=run_id,
            agent_name=AGENT_NAMES[0],
            agent_role=AGENT_NAMES[0],
            task_description=f"Research: {topic}",
        )
    )

    # Register tool event listener to capture tool calls via CrewAI's event bus
    _tool_listener = ToolEventListener(manager, run_id)

    # Timeout: 10 minutes max for crew execution
    CREW_TIMEOUT_SECONDS = 600

    try:
        start = time.time()
        result = await asyncio.wait_for(
            asyncio.to_thread(crew.kickoff, inputs={"topic": topic}),
            timeout=CREW_TIMEOUT_SECONDS,
        )
        duration_ms = (time.time() - start) * 1000

        total_tokens = token_tracker.cumulative_total
        if result.token_usage:
            token_tracker.snap_to_real(result.token_usage)
            total_tokens = token_tracker.cumulative_total

        manager.sync_broadcast(
            CrewCompleteEvent(
                run_id=run_id,
                final_output=result.raw,
                total_tokens=total_tokens,
                total_cost_usd=token_tracker.total_cost,
                total_duration_ms=duration_ms,
                tasks_completed=len(result.tasks_output),
            )
        )

        manager.update_run_state(
            status="complete",
            metrics={
                "totalTokens": total_tokens,
                "estimatedCost": token_tracker.total_cost,
                "durationMs": duration_ms,
            },
        )
        logger.info("Crew run %s completed in %.1fs", run_id, duration_ms / 1000)

    except (asyncio.CancelledError, CrewCancelledError):
        # CancelledError: asyncio task was cancelled from outside
        # CrewCancelledError: cancel_event was set, caught by step callback inside the thread
        if cancel_event is not None:
            cancel_event.set()  # ensure the event is set so any remaining callbacks also abort
        duration_ms = (time.time() - start) * 1000
        logger.info("Crew run %s cancelled after %.1fs", run_id, duration_ms / 1000)
        manager.sync_broadcast(
            ErrorEvent(
                run_id=run_id,
                agent_name=None,
                error_message="Crew execution was cancelled",
                error_type="CancelledError",
            )
        )
        manager.update_run_state(status="cancelled")
    except asyncio.TimeoutError:
        if cancel_event is not None:
            cancel_event.set()  # signal the thread to stop at the next step callback
        duration_ms = (time.time() - start) * 1000
        logger.error("Crew run %s timed out after %.1fs", run_id, duration_ms / 1000)
        manager.sync_broadcast(
            ErrorEvent(
                run_id=run_id,
                agent_name=None,
                error_message=f"Crew execution timed out after {CREW_TIMEOUT_SECONDS}s",
                error_type="TimeoutError",
            )
        )
        manager.update_run_state(status="error")
    except Exception as e:
        logger.exception("Crew run %s failed: %s", run_id, e)
        manager.sync_broadcast(
            ErrorEvent(
                run_id=run_id,
                agent_name=None,
                error_message=str(e),
                error_type=type(e).__name__,
            )
        )
        manager.update_run_state(status="error")
    finally:
        event_logger.close()
        manager.set_event_logger(None)
