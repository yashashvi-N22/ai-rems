from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class WeatherObservation(BaseModel):
    timestamp: datetime
    location_name: str
    latitude: float
    longitude: float
    temperature_c: float
    relative_humidity: float
    surface_pressure_hpa: Optional[float] = None
    cloud_cover_pct: float
    precipitation_mm: float = 0.0
    ghi: float = Field(..., description="Global Horizontal Irradiance in W/m^2")
    dni: float = Field(..., description="Direct Normal Irradiance in W/m^2")
    dhi: float = Field(..., description="Diffuse Horizontal Irradiance in W/m^2")
    wind_speed_10m: float = Field(..., description="Wind speed at 10m in m/s")
    wind_speed_100m: float = Field(..., description="Wind speed at 100m hub height in m/s")
    wind_direction_deg: float
    wind_gusts_10m: Optional[float] = None
    source: str = "OPEN_METEO_LIVE_API"

class HourlyForecastPoint(BaseModel):
    time: datetime
    temperature_c: float
    cloud_cover_pct: float
    ghi: float
    dni: float
    dhi: float
    wind_speed_10m: float
    wind_speed_100m: float
    wind_direction_deg: float
    estimated_solar_kw: float
    estimated_wind_kw: float

class WeatherForecastResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    forecast_generated_at: datetime
    horizon_hours: int
    hourly: List[HourlyForecastPoint]

class LocationChangeRequest(BaseModel):
    location_name: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    altitude_m: Optional[float] = 100.0

class LocationPreset(BaseModel):
    id: str
    name: str
    state_country: str
    latitude: float
    longitude: float
    altitude_m: float
    description: str
