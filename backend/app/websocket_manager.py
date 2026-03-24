from __future__ import annotations

import asyncio
import logging
import threading
import uuid
from collections import deque
from dataclasses import dataclass, field

from fastapi import WebSocket

from .event_types import BaseEvent, HeartbeatEvent, RunStateSnapshot
from .utils.event_logger import EventLogger

logger = logging.getLogger(__name__)

MAX_RECENT_THOUGHTS = 200
SNAPSHOT_THOUGHTS_LIMIT = 50


@dataclass
class RunState:
    status: str = "idle"
    run_id: str = ""
    topic: str = ""
    agents: list[dict] = field(default_factory=list)
    tasks: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    recent_thoughts: deque[dict] = field(default_factory=lambda: deque(maxlen=MAX_RECENT_THOUGHTS))

    def to_snapshot(self) -> RunStateSnapshot:
        # Only materialize the last SNAPSHOT_THOUGHTS_LIMIT items from the deque
        # instead of copying all MAX_RECENT_THOUGHTS then slicing.
        n = len(self.recent_thoughts)
        start = max(0, n - SNAPSHOT_THOUGHTS_LIMIT)
        thoughts = [self.recent_thoughts[i] for i in range(start, n)]
        return RunStateSnapshot(
            run_id=self.run_id,
            status=self.status,
            agents=self.agents,
            tasks=self.tasks,
            metrics=self.metrics,
            recent_thoughts=thoughts,
            topic=self.topic,
        )


class ConnectionManager:
    # Max queued events before backpressure drops oldest events
    MAX_QUEUE_SIZE = 2000

    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}
        self.event_queue: asyncio.Queue[BaseEvent] = asyncio.Queue(maxsize=self.MAX_QUEUE_SIZE)
        self._loop: asyncio.AbstractEventLoop | None = None
        self.run_state = RunState()
        self._run_state_lock = threading.Lock()
        self._event_logger: EventLogger | None = None
        self._background_tasks: list[asyncio.Task] = []

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def set_event_logger(self, logger: EventLogger | None) -> None:
        self._event_logger = logger

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self.active_connections[conn_id] = websocket

        if self.run_state.status != "idle":
            snapshot = self.run_state.to_snapshot()
            try:
                await websocket.send_text(snapshot.model_dump_json())
            except Exception as e:
                logger.warning("Failed to send snapshot to new connection %s: %s", conn_id, e)

        return conn_id

    async def disconnect(self, conn_id: str) -> None:
        self.active_connections.pop(conn_id, None)

    async def broadcast(self, event: BaseEvent) -> None:
        data = event.model_dump_json()
        failed = []
        for conn_id, ws in list(self.active_connections.items()):
            try:
                await ws.send_text(data)
            except Exception:
                logger.debug("WebSocket send failed for %s, removing connection", conn_id)
                failed.append(conn_id)
        for conn_id in failed:
            self.active_connections.pop(conn_id, None)

        if self._event_logger and event.type != "heartbeat":
            try:
                self._event_logger.log(event, cached_json=data)  # type: ignore[union-attr]
            except Exception as e:
                logger.warning("Failed to log event: %s", e)

    async def event_pump(self) -> None:
        try:
            while True:
                event = await self.event_queue.get()
                await self.broadcast(event)
        except asyncio.CancelledError:
            logger.info("Event pump cancelled, draining remaining events")
            while not self.event_queue.empty():
                try:
                    event = self.event_queue.get_nowait()
                    await self.broadcast(event)
                except asyncio.QueueEmpty:
                    break
            raise

    def sync_broadcast(self, event: BaseEvent) -> None:
        if self._loop is None:
            logger.warning("Event loop not set, dropping event: %s", event.type)
            return
        try:
            self._loop.call_soon_threadsafe(self.event_queue.put_nowait, event)
        except asyncio.QueueFull:
            logger.warning("Event queue full (%d), dropping event: %s", self.MAX_QUEUE_SIZE, event.type)

    async def heartbeat_loop(self, interval: float = 15.0) -> None:
        try:
            while True:
                await asyncio.sleep(interval)
                heartbeat = HeartbeatEvent(run_id=self.run_state.run_id or "")
                await self.broadcast(heartbeat)
        except asyncio.CancelledError:
            logger.info("Heartbeat loop cancelled")
            raise

    def update_run_state(
        self,
        status: str | None = None,
        run_id: str | None = None,
        topic: str | None = None,
        agents: list[dict] | None = None,
        tasks: list[dict] | None = None,
        metrics: dict | None = None,
        thought: dict | None = None,
    ) -> None:
        with self._run_state_lock:
            if status is not None:
                self.run_state.status = status
            if run_id is not None:
                self.run_state.run_id = run_id
            if topic is not None:
                self.run_state.topic = topic
            if agents is not None:
                self.run_state.agents = agents
            if tasks is not None:
                self.run_state.tasks = tasks
            if metrics is not None:
                self.run_state.metrics = metrics
            if thought is not None:
                self.run_state.recent_thoughts.append(thought)

    def reset_run_state(self) -> None:
        with self._run_state_lock:
            self.run_state = RunState()

    def start_background_tasks(self) -> None:
        pump = asyncio.create_task(self.event_pump(), name="event_pump")
        hb = asyncio.create_task(self.heartbeat_loop(), name="heartbeat_loop")
        self._background_tasks = [pump, hb]

    async def shutdown(self) -> None:
        for task in self._background_tasks:
            task.cancel()
        results = await asyncio.gather(*self._background_tasks, return_exceptions=True)
        for task, result in zip(self._background_tasks, results):
            if isinstance(result, Exception) and not isinstance(result, asyncio.CancelledError):
                logger.error("Background task %s failed during shutdown: %s", task.get_name(), result)
        self._background_tasks.clear()
        # Close all active WebSocket connections
        for conn_id, ws in list(self.active_connections.items()):
            try:
                await ws.close()
            except Exception:
                pass
        self.active_connections.clear()


manager = ConnectionManager()
