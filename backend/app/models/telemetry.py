from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from app.database import Base

class MicrogridTelemetry(Base):
    __tablename__ = "microgrid_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    system_id = Column(String(50), default="MICROGRID_01")
    
    # Power metrics (kW)
    solar_generation_kw = Column(Float, nullable=False)
    wind_generation_kw = Column(Float, nullable=False)
    total_renewable_generation_kw = Column(Float, nullable=False)
    demand_load_kw = Column(Float, nullable=False)
    
    # Battery Energy Storage System (BESS)
    battery_soc_pct = Column(Float, nullable=False)       # 0.0 - 100.0%
    battery_power_kw = Column(Float, nullable=False)      # >0 discharging to load, <0 charging
    battery_temperature_c = Column(Float, default=25.0)
    battery_soh_pct = Column(Float, default=100.0)        # State of Health
    
    # Grid Interconnection
    grid_import_kw = Column(Float, default=0.0)           # Power bought from grid
    grid_export_kw = Column(Float, default=0.0)           # Excess power sold to grid
    grid_tariff_inr = Column(Float, nullable=False)       # Current ₹/kWh
    
    # Sustainability & KPIs
    renewable_fraction_pct = Column(Float, nullable=False) # % of demand met by renewables
    carbon_avoided_kg = Column(Float, default=0.0)         # Cumulative or step CO2 avoided
    cost_incurred_inr = Column(Float, default=0.0)
    
    is_simulated = Column(Boolean, default=False)
