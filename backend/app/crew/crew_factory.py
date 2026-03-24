from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING

from crewai import Crew, LLM, Process

from ..config import get_thinking_params, settings
from ..event_types import CrewCompleteEvent, CrewStartEvent, ErrorEvent
from ..utils.event_logger import EventLogger
from ..utils.token_tracker import TokenTracker
from .agents import create_agents
from .callbacks import make_step_callback_factory, make_task_callback
from .tasks import create_tasks
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
) -> None:
    model_name = model_override or settings.MODEL_NAME
    event_logger = EventLogger(run_id)
    manager.set_event_logger(event_logger)

    token_tracker = TokenTracker(model_name)

    thinking_params = get_thinking_params(model_name, thinking_level)
    llm = LLM(model=model_name, **thinking_params)
    logger.info("Using model=%s thinking_level=%s params=%s", model_name, thinking_level, thinking_params)

    task_start_times: dict[str, float] = {}
    cb_factory = make_step_callback_factory(manager, run_id, token_tracker, task_start_times)
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
        agents=[{"name": n, "status": "idle"} for n in AGENT_NAMES],
        tasks=[
            {"description": "Research", "agent": AGENT_NAMES[0], "status": "pending"},
            {"description": "Write", "agent": AGENT_NAMES[1], "status": "pending"},
            {"description": "Review", "agent": AGENT_NAMES[2], "status": "pending"},
        ],
        metrics={"totalTokens": 0, "estimatedCost": 0.0},
    )

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
        manager.update_run_state(status="complete")
        logger.info("Crew run %s completed in %.1fs", run_id, duration_ms / 1000)

    except asyncio.TimeoutError:
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
        manager.update_run_state(status="error")
    finally:
        event_logger.close()
        manager.set_event_logger(None)
