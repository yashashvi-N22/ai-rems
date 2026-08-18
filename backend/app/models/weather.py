from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime
from app.database import Base

class WeatherTelemetry(Base):
    __tablename__ = "weather_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    location_name = Column(String(100), default="Charanka Solar-Wind Hybrid Hub, Gujarat")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Atmospheric metrics
    temperature_c = Column(Float, nullable=False)
    relative_humidity = Column(Float, nullable=False)
    surface_pressure_hpa = Column(Float, nullable=True)
    cloud_cover_pct = Column(Float, nullable=False)
    precipitation_mm = Column(Float, default=0.0)
    
    # Solar Irradiance metrics (W/m^2)
    ghi = Column(Float, nullable=False)  # Global Horizontal Irradiance
    dni = Column(Float, nullable=False)  # Direct Normal Irradiance
    dhi = Column(Float, nullable=False)  # Diffuse Horizontal Irradiance
    
    # Wind metrics
    wind_speed_10m = Column(Float, nullable=False)   # m/s
    wind_speed_100m = Column(Float, nullable=False)  # m/s (hub height)
    wind_direction_deg = Column(Float, nullable=False)
    wind_gusts_10m = Column(Float, nullable=True)
    
    source = Column(String(50), default="OPEN_METEO_LIVE_API")
