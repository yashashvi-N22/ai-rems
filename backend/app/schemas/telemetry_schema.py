from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class PowerFlowBreakdown(BaseModel):
    solar_to_load_kw: float
    solar_to_batt_kw: float
    solar_to_grid_kw: float
    solar_curtailed_kw: float
    wind_to_load_kw: float
    wind_to_batt_kw: float
    wind_to_grid_kw: float
    wind_curtailed_kw: float
    batt_to_load_kw: float
    grid_to_load_kw: float
    grid_to_batt_kw: float

class MicrogridLiveTelemetry(BaseModel):
    timestamp: datetime
    system_id: str = "MICROGRID_01"
    
    # Generation & Demand
    solar_generation_kw: float
    wind_generation_kw: float
    total_renewable_generation_kw: float
    demand_load_kw: float
    net_load_kw: float  # Demand - Total Renewables
    
    # BESS
    battery_soc_pct: float
    battery_power_kw: float  # >0 discharging, <0 charging
    battery_status: str      # CHARGING, DISCHARGING, IDLE
    battery_temperature_c: float
    battery_soh_pct: float
    
    # Grid Interconnection
    grid_import_kw: float
    grid_export_kw: float
    grid_status: str        # IMPORTING, EXPORTING, ZERO_EXCHANGE
    grid_tariff_inr: float
    
    # KPIs & Sustainability
    renewable_fraction_pct: float
    carbon_avoided_kg_per_hr: float
    current_cost_rate_inr_per_hr: float
    
    # Power Flow Network
    flow: PowerFlowBreakdown
    
    # Meteorological Context
    weather_summary: dict
    is_simulated: bool = False

class MicrogridHistoryPoint(BaseModel):
    timestamp: datetime
    solar_kw: float
    wind_kw: float
    demand_kw: float
    battery_soc_pct: float
    battery_power_kw: float
    grid_import_kw: float
    grid_export_kw: float
    renewable_fraction_pct: float
