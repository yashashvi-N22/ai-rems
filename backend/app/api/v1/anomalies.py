from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.anomaly_schema import AnomalyDiagnosticResponse
from app.services.anomaly_service import anomaly_service

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection & Predictive Maintenance"])

@router.get("/diagnostics", response_model=ApiResponse[AnomalyDiagnosticResponse])
async def get_system_diagnostics():
    """
    Run multidimensional telemetry diagnostic scan returning active component health indices and predictive maintenance alerts.
    """
    diag = anomaly_service.scan_telemetry_diagnostics()
    return ApiResponse(
        success=True,
        message="System telemetry diagnostic scan completed successfully",
        data=diag
    )
