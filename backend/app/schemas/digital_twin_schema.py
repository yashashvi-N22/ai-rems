from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class StressTestScenarioParams(BaseModel):
    scenario_type: str = Field("CLOUD_COVER_STORM", description="CLOUD_COVER_STORM, WIND_DROUGHT, INDUSTRIAL_LOAD_SPIKE, GRID_BLACKOUT, HEATWAVE_DERATING, CUSTOM")
    solar_capacity_kw: float = Field(100.0, ge=0.0, le=2000.0)
    wind_capacity_kw: float = Field(100.0, ge=0.0, le=2000.0)
    battery_capacity_kwh: float = Field(200.0, ge=0.0, le=5000.0)
    initial_soc_pct: float = Field(60.0, ge=10.0, le=100.0)
    cloud_attenuation_pct: float = Field(0.0, ge=0.0, le=100.0, description="Solar irradiance reduction %")
    wind_speed_multiplier: float = Field(1.0, ge=0.0, le=3.0)
    load_surge_multiplier: float = Field(1.0, ge=0.5, le=4.0)
    grid_outage_hours: List[int] = Field(default_factory=list, description="Hours where grid is disconnected (1-24)")
    ambient_temp_c: float = Field(32.0, ge=-10.0, le=55.0)

class SimulatedTimestep(BaseModel):
    hour: int
    time: datetime
    solar_gen_kw: float
    wind_gen_kw: float
    demand_load_kw: float
    battery_power_kw: float
    battery_soc_pct: float
    grid_import_kw: float
    grid_export_kw: float
    unserved_load_kw: float
    curtailed_energy_kw: float
    grid_available: bool
    system_frequency_hz: float
    stability_status: str

class SimulationStressTestResponse(BaseModel):
    scenario_name: str
    run_timestamp: datetime
    horizon_hours: int
    total_solar_kwh: float
    total_wind_kwh: float
    total_demand_kwh: float
    total_unserved_energy_kwh: float
    total_curtailed_kwh: float
    max_grid_import_kw: float
    min_battery_soc_pct: float
    max_battery_soc_pct: float
    islanding_resilience_score_pct: float
    grid_outage_survived: bool
    summary_notes: str
    timesteps: List[SimulatedTimestep]

class CapacitySizingRequest(BaseModel):
    solar_kw: float = Field(100.0, ge=10.0, le=5000.0)
    wind_kw: float = Field(100.0, ge=0.0, le=5000.0)
    battery_kwh: float = Field(200.0, ge=0.0, le=10000.0)
    grid_buy_tariff_inr: float = Field(7.50, ge=2.0, le=25.0)
    project_lifetime_years: int = Field(20, ge=5, le=30)
    discount_rate_pct: float = Field(8.0, ge=1.0, le=20.0)

class CapacitySizingResponse(BaseModel):
    solar_kw: float
    wind_kw: float
    battery_kwh: float
    total_capex_inr: float
    annual_opex_inr: float
    annual_generation_kwh: float
    annual_savings_inr: float
    payback_period_years: float
    ten_year_npv_inr: float
    twenty_year_npv_inr: float
    lcoe_inr_per_kwh: float
    co2_abatement_tons_per_year: float
    renewable_fraction_pct: float
