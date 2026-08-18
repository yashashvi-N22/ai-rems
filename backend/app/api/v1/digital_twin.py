from fastapi import APIRouter, Body
from app.schemas.common import ApiResponse
from app.schemas.digital_twin_schema import (
    StressTestScenarioParams,
    SimulationStressTestResponse,
    CapacitySizingRequest,
    CapacitySizingResponse
)
from app.services.digital_twin_service import digital_twin_service

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin & What-If Sandbox"])

@router.post("/simulate", response_model=ApiResponse[SimulationStressTestResponse])
async def simulate_stress_test(params: StressTestScenarioParams = Body(...)):
    """
    Run a high-fidelity 24-hour physical what-if simulation under custom weather, load, or grid outage conditions.
    """
    result = digital_twin_service.run_stress_test(params)
    return ApiResponse(
        success=True,
        message=f"Stress test scenario '{params.scenario_type}' completed successfully",
        data=result
    )

@router.post("/capacity-sizing", response_model=ApiResponse[CapacitySizingResponse])
async def compute_capacity_sizing(req: CapacitySizingRequest = Body(...)):
    """
    Compute CAPEX, OPEX, 10-year / 20-year Net Present Value (NPV), Payback Period, and LCOE for custom asset mix.
    """
    result = digital_twin_service.calculate_capacity_roi(req)
    return ApiResponse(
        success=True,
        message="Asset capacity sizing and financial ROI calculated successfully",
        data=result
    )
