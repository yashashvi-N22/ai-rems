from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemHealth(BaseModel):
    status: str = "HEALTHY"
    version: str
    uptime_seconds: float
    database_connected: bool
    live_weather_api_connected: bool
    websocket_clients_active: int
    environment: str
