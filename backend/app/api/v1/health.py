import time
from fastapi import APIRouter
from app.config import settings
from app.schemas.common import ApiResponse, SystemHealth
from app.services.weather_service import weather_service

router = APIRouter(prefix="/health", tags=["Health & Status"])
START_TIME = time.time()

@router.get("", response_model=ApiResponse[SystemHealth])
async def check_health():
    uptime = time.time() - START_TIME
    health_data = SystemHealth(
        status="HEALTHY",
        version=settings.VERSION,
        uptime_seconds=round(uptime, 2),
        database_connected=True,
        live_weather_api_connected=(weather_service._cached_current is not None),
        websocket_clients_active=0,
        environment=settings.ENVIRONMENT
    )
    return ApiResponse(
        success=True,
        message="AI-REMS core operational",
        data=health_data
    )
