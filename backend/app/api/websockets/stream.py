import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.telemetry_service import telemetry_service
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                dead_connections.add(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

manager = ConnectionManager()

@router.websocket("/ws/live-stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Immediately push the latest telemetry upon connection
        latest = await telemetry_service.compute_live_telemetry()
        await websocket.send_json({
            "event": "INITIAL_STATE",
            "data": latest.model_dump(mode="json"),
            "history": [p.model_dump(mode="json") for p in telemetry_service.get_history(limit=40)]
        })
        
        while True:
            # Receive client ping or control messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG", "timestamp": asyncio.get_event_loop().time()})
                elif msg.get("type") == "TRIGGER_UPDATE":
                    updated = await telemetry_service.compute_live_telemetry()
                    await websocket.send_json({
                        "event": "TELEMETRY_UPDATE",
                        "data": updated.model_dump(mode="json")
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        manager.disconnect(websocket)
