import logging
from io import TextIOWrapper
from pathlib import Path

from ..event_types import BaseEvent

logger = logging.getLogger(__name__)


class EventLogger:
    def __init__(self, run_id: str) -> None:
        self.path = Path("logs") / f"{run_id}.jsonl"
        self.path.parent.mkdir(exist_ok=True)
        self._file: TextIOWrapper | None = None
        self._failed: bool = False

    def _ensure_open(self) -> TextIOWrapper | None:
        if self._failed:
            return None
        if self._file is None or self._file.closed:
            try:
                self._file = open(self.path, "a")
            except OSError as e:
                logger.error("Cannot open event log %s: %s", self.path, e)
                self._failed = True
                return None
        return self._file

    def log(self, event: BaseEvent, *, cached_json: str | None = None) -> None:
        f = self._ensure_open()
        if f is None:
            return
        try:
            data = cached_json if cached_json is not None else event.model_dump_json()
            f.write(data + "\n")
            f.flush()
        except OSError as e:
            logger.error("Failed to write event log: %s", e)
            self._failed = True
            self.close()

    def close(self) -> None:
        if self._file and not self._file.closed:
            try:
                self._file.close()
            except OSError:
                pass
        self._file = None
