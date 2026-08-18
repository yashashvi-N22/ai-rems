from typing import Optional
from fastapi import APIRouter, Query, Body
from app.config import settings
from app.schemas.common import ApiResponse
from app.schemas.optimizer_schema import (
    OptimizationWeights,
    OptimizationScheduleResponse
)
from app.services.forecast_service import forecast_service
from app.services.optimizer_service import optimizer_service
from app.services.telemetry_service import telemetry_service

router = APIRouter(prefix="/optimizer", tags=["Battery & MILP Energy Optimization"])

@router.get("/schedule", response_model=ApiResponse[OptimizationScheduleResponse])
async def get_optimal_schedule(
    cost_weight: float = Query(0.5, ge=0.0, le=1.0, description="Cost minimization weight (alpha)"),
    carbon_weight: float = Query(0.3, ge=0.0, le=1.0, description="Carbon reduction weight (beta)"),
    battery_health_weight: float = Query(0.2, ge=0.0, le=1.0, description="Battery longevity weight (gamma)"),
    horizon_hours: int = Query(24, ge=1, le=48, description="Lookahead horizon in hours")
):
    """
    Compute or retrieve active 24-hour lookahead MILP optimal dispatch schedule.
    """
    forecast = await forecast_service.generate_24h_forecast(horizon_hours=horizon_hours)
    solar_vals = [pt.predicted_p50 for pt in forecast.solar.hourly_predictions]
    wind_vals = [pt.predicted_p50 for pt in forecast.wind.hourly_predictions]
    demand_vals = [pt.predicted_p50 for pt in forecast.demand.hourly_predictions]
    timestamps = [pt.time for pt in forecast.solar.hourly_predictions]
    
    # Calculate time-of-use tariffs
    tariffs = []
    for ts in timestamps:
        hour = ts.hour
        if 18 <= hour <= 22:
            tariffs.append(settings.DEFAULT_GRID_PEAK_TARIFF_INR)
        elif 0 <= hour <= 6:
            tariffs.append(settings.DEFAULT_GRID_BUY_TARIFF_INR * 0.85)
        else:
            tariffs.append(settings.DEFAULT_GRID_BUY_TARIFF_INR)

    weights = OptimizationWeights(
        cost_weight=cost_weight,
        carbon_weight=carbon_weight,
        battery_health_weight=battery_health_weight
    )

    current_soc = telemetry_service.battery_soc_pct

    schedule = optimizer_service.solve_optimal_dispatch(
        solar_forecast=solar_vals,
        wind_forecast=wind_vals,
        demand_forecast=demand_vals,
        timestamps=timestamps,
        tariffs=tariffs,
        initial_soc_pct=current_soc,
        weights=weights
    )

    return ApiResponse(
        success=True,
        message="24-hour MILP optimal dispatch schedule calculated successfully",
        data=schedule
    )

@router.post("/solve", response_model=ApiResponse[OptimizationScheduleResponse])
async def solve_custom_optimization(
    weights: OptimizationWeights = Body(...),
    initial_soc_pct: Optional[float] = Query(None, ge=10.0, le=100.0),
    horizon_hours: int = Query(24, ge=1, le=48)
):
    """
    Solve MILP optimal power flow with custom multi-objective weights and initial state.
    """
    forecast = await forecast_service.generate_24h_forecast(horizon_hours=horizon_hours)
    solar_vals = [pt.predicted_p50 for pt in forecast.solar.hourly_predictions]
    wind_vals = [pt.predicted_p50 for pt in forecast.wind.hourly_predictions]
    demand_vals = [pt.predicted_p50 for pt in forecast.demand.hourly_predictions]
    timestamps = [pt.time for pt in forecast.solar.hourly_predictions]
    
    tariffs = [
        settings.DEFAULT_GRID_PEAK_TARIFF_INR if 18 <= ts.hour <= 22
        else settings.DEFAULT_GRID_BUY_TARIFF_INR * 0.85 if 0 <= ts.hour <= 6
        else settings.DEFAULT_GRID_BUY_TARIFF_INR
        for ts in timestamps
    ]

    soc = initial_soc_pct if initial_soc_pct is not None else telemetry_service.battery_soc_pct

    schedule = optimizer_service.solve_optimal_dispatch(
        solar_forecast=solar_vals,
        wind_forecast=wind_vals,
        demand_forecast=demand_vals,
        timestamps=timestamps,
        tariffs=tariffs,
        initial_soc_pct=soc,
        weights=weights
    )

    return ApiResponse(
        success=True,
        message="Custom multi-objective optimization solved successfully",
        data=schedule
    )
