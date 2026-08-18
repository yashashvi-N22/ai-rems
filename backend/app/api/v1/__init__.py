from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.weather import router as weather_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.optimizer import router as optimizer_router
from app.api.v1.digital_twin import router as digital_twin_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.xai import router as xai_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.rl_dispatch import router as rl_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(weather_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(forecast_router)
api_v1_router.include_router(optimizer_router)
api_v1_router.include_router(digital_twin_router)
api_v1_router.include_router(anomalies_router)
api_v1_router.include_router(xai_router)
api_v1_router.include_router(assistant_router)
api_v1_router.include_router(rl_router)

__all__ = ["api_v1_router"]
