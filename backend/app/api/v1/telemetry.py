from typing import List
from fastapi import APIRouter, Query
from app.schemas.common import ApiResponse
from app.schemas.telemetry_schema import MicrogridLiveTelemetry, MicrogridHistoryPoint
from app.services.telemetry_service import telemetry_service

router = APIRouter(prefix="/telemetry", tags=["Microgrid Real-Time Telemetry"])

@router.get("/live", response_model=ApiResponse[MicrogridLiveTelemetry])
async def get_live_telemetry():
    """
    Retrieve instantaneous microgrid power flow, BESS battery state, generation, load, and carbon metrics.
    """
    telemetry = await telemetry_service.compute_live_telemetry()
    return ApiResponse(
        success=True,
        message="Instantaneous microgrid telemetry computed successfully",
        data=telemetry
    )

@router.get("/history", response_model=ApiResponse[List[MicrogridHistoryPoint]])
async def get_telemetry_history(
    limit: int = Query(60, ge=10, le=120, description="Number of historical time points to return")
):
    """
    Retrieve historical time-series telemetry for real-time charting.
    """
    history = telemetry_service.get_history(limit=limit)
    return ApiResponse(
        success=True,
        message=f"Retrieved last {len(history)} telemetry points",
        data=history
    )
