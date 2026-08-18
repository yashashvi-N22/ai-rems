from typing import Optional, List
from fastapi import APIRouter, Query, Body
from app.config import settings
from app.schemas.common import ApiResponse
from app.schemas.weather_schema import (
    WeatherObservation,
    WeatherForecastResponse,
    LocationChangeRequest,
    LocationPreset
)
from app.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Live Weather & Irradiance"])

@router.get("/locations", response_model=ApiResponse[List[LocationPreset]])
async def get_location_presets():
    """
    Retrieve curated national and international microgrid reference location presets.
    """
    presets = weather_service.get_presets()
    return ApiResponse(
        success=True,
        message="Available location presets retrieved successfully",
        data=presets
    )

@router.post("/set-location", response_model=ApiResponse[WeatherObservation])
async def set_plant_location(req: LocationChangeRequest = Body(...)):
    """
    Dynamically update the active microgrid geographical coordinates and immediately poll live satellite weather.
    """
    weather_service.set_location(
        name=req.location_name,
        lat=req.latitude,
        lon=req.longitude,
        alt_m=req.altitude_m or 100.0
    )
    obs = await weather_service.fetch_live_weather(
        latitude=req.latitude,
        longitude=req.longitude,
        location_name=req.location_name
    )
    return ApiResponse(
        success=True,
        message=f"Plant location updated to {req.location_name} and live weather synchronized",
        data=obs
    )

@router.get("/current", response_model=ApiResponse[WeatherObservation])
async def get_current_weather(
    latitude: Optional[float] = Query(None, description="Plant latitude"),
    longitude: Optional[float] = Query(None, description="Plant longitude"),
    location_name: Optional[str] = Query(None, description="Plant location description")
):
    """
    Retrieve real-time solar irradiance, wind speed, and meteorological telemetry from Open-Meteo REST API.
    """
    observation = await weather_service.fetch_live_weather(
        latitude=latitude,
        longitude=longitude,
        location_name=location_name
    )
    return ApiResponse(
        success=True,
        message=f"Live meteorological telemetry retrieved for {observation.location_name}",
        data=observation
    )

@router.get("/forecast", response_model=ApiResponse[WeatherForecastResponse])
async def get_weather_forecast(
    latitude: Optional[float] = Query(None, description="Plant latitude"),
    longitude: Optional[float] = Query(None, description="Plant longitude"),
    location_name: Optional[str] = Query(None, description="Plant location description"),
    horizon_hours: int = Query(24, ge=1, le=48, description="Forecast horizon in hours (1-48)")
):
    """
    Retrieve 24-48 hour hourly weather and irradiance forecast with physics-based solar and wind generation estimates.
    """
    forecast = await weather_service.fetch_weather_forecast(
        latitude=latitude or weather_service.active_latitude,
        longitude=longitude or weather_service.active_longitude,
        location_name=location_name or weather_service.active_location_name,
        horizon_hours=horizon_hours
    )
    return ApiResponse(
        success=True,
        message=f"{horizon_hours}-hour meteorological and renewable forecast retrieved",
        data=forecast
    )
