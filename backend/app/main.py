from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.crew_routes import router as crew_router
from .routes.ws_routes import router as ws_router
from .websocket_manager import manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    load_dotenv()
    manager.set_loop(asyncio.get_running_loop())
    manager.start_background_tasks()
    Path("logs").mkdir(exist_ok=True)
    logger.info("Agent Observatory backend started")
    yield
    logger.info("Shutting down — cancelling background tasks")
    await manager.shutdown()
    logger.info("Shutdown complete")


app = FastAPI(title="CrewAI Agent Observatory", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(crew_router)
app.include_router(ws_router)


@app.get("/")
async def health() -> dict:
    return {"status": "ok", "service": "crewai-observatory"}
