from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class OptimizationWeights(BaseModel):
    cost_weight: float = Field(0.5, ge=0.0, le=1.0, description="Weight for energy cost minimization (alpha)")
    carbon_weight: float = Field(0.3, ge=0.0, le=1.0, description="Weight for CO2 emissions reduction (beta)")
    battery_health_weight: float = Field(0.2, ge=0.0, le=1.0, description="Weight for battery cycle degradation preservation (gamma)")

class HourlyDispatchSchedule(BaseModel):
    hour_index: int
    time: datetime
    tariff_inr_kwh: float
    solar_forecast_kw: float
    wind_forecast_kw: float
    demand_forecast_kw: float
    
    # Decision Variables
    solar_to_load_kw: float
    solar_to_batt_kw: float
    solar_to_grid_kw: float
    solar_curtailed_kw: float
    
    wind_to_load_kw: float
    wind_to_batt_kw: float
    wind_to_grid_kw: float
    wind_curtailed_kw: float
    
    batt_discharge_to_load_kw: float
    grid_import_to_load_kw: float
    grid_import_to_batt_kw: float
    
    # State Trajectory
    battery_soc_pct: float
    net_grid_exchange_kw: float
    hourly_cost_inr: float
    hourly_co2_kg: float

class OptimizationSummaryKPIs(BaseModel):
    total_cost_inr: float
    total_grid_import_kwh: float
    total_grid_export_kwh: float
    total_co2_emissions_kg: float
    total_co2_avoided_kg: float
    renewable_utilization_pct: float
    battery_equivalent_full_cycles: float
    peak_demand_kw: float
    solver_status: str
    solve_time_ms: float

class OptimizationComparison(BaseModel):
    rule_based_cost_inr: float
    milp_cost_inr: float
    cost_savings_inr: float
    cost_savings_pct: float
    
    rule_based_co2_kg: float
    milp_co2_kg: float
    co2_reduction_kg: float
    co2_reduction_pct: float
    
    rule_based_grid_import_kwh: float
    milp_grid_import_kwh: float
    grid_import_reduction_kwh: float

class OptimizationScheduleResponse(BaseModel):
    generated_at: datetime
    horizon_hours: int
    optimization_mode: str
    weights: OptimizationWeights
    initial_soc_pct: float
    schedule: List[HourlyDispatchSchedule]
    kpis: OptimizationSummaryKPIs
    comparison_vs_baseline: OptimizationComparison
