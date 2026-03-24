import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    conn_id = await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("WebSocket connection %s error: %s", conn_id, e)
    finally:
        await manager.disconnect(conn_id)
