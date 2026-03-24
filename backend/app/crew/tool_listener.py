"""Listens to CrewAI's event bus for tool usage events and forwards them to the WebSocket pipeline."""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from crewai.events import crewai_event_bus
from crewai.events.base_event_listener import BaseEventListener
from crewai.events.types.tool_usage_events import (
    ToolUsageFinishedEvent,
    ToolUsageStartedEvent,
)

from ..event_types import ToolCallEvent, ToolResultEvent

if TYPE_CHECKING:
    from ..websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)


class ToolEventListener(BaseEventListener):
    def __init__(self, manager: ConnectionManager, run_id: str) -> None:
        super().__init__()
        self._manager = manager
        self._run_id = run_id
        self._start_times: dict[str, float] = {}

    def setup_listeners(self, crewai_event_bus) -> None:  # type: ignore[override]
        @crewai_event_bus.on(ToolUsageStartedEvent)
        def on_tool_started(source, event: ToolUsageStartedEvent) -> None:
            agent_role = getattr(event, "agent_role", "") or "Unknown"
            tool_name = getattr(event, "tool_name", "") or "unknown_tool"
            tool_args = getattr(event, "tool_args", {}) or {}
            event_id = getattr(event, "event_id", "")

            if event_id:
                self._start_times[event_id] = time.time()

            if isinstance(tool_args, str):
                tool_args = {"input": tool_args}

            self._manager.sync_broadcast(
                ToolCallEvent(
                    run_id=self._run_id,
                    agent_name=agent_role,
                    tool_name=tool_name,
                    tool_input=tool_args if isinstance(tool_args, dict) else {},
                )
            )
            self._manager.update_run_state(
                thought={"type": "tool_call", "agent_name": agent_role, "tool_name": tool_name}
            )

        @crewai_event_bus.on(ToolUsageFinishedEvent)
        def on_tool_finished(source, event: ToolUsageFinishedEvent) -> None:
            agent_role = getattr(event, "agent_role", "") or "Unknown"
            tool_name = getattr(event, "tool_name", "") or "unknown_tool"
            output = getattr(event, "output", "") or ""
            started_event_id = getattr(event, "started_event_id", "")

            duration_ms = 0.0
            if started_event_id and started_event_id in self._start_times:
                duration_ms = (time.time() - self._start_times.pop(started_event_id)) * 1000

            output_str = str(output)[:2000]

            self._manager.sync_broadcast(
                ToolResultEvent(
                    run_id=self._run_id,
                    agent_name=agent_role,
                    tool_name=tool_name,
                    result_preview=output_str,
                    duration_ms=duration_ms,
                )
            )
            self._manager.update_run_state(
                thought={
                    "type": "tool_result",
                    "agent_name": agent_role,
                    "tool_name": tool_name,
                    "preview": output_str[:300],
                }
            )
