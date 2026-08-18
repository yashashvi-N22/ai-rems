import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.weather_service import weather_service
from app.services.telemetry_service import telemetry_service
from app.config import settings

@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["system"] == "AI-REMS"
        assert data["status"] == "ONLINE"

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"{settings.API_V1_STR}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "HEALTHY"

@pytest.mark.asyncio
async def test_weather_live_fetch():
    """Verify live meteorological data retrieval from Open-Meteo or fallback."""
    obs = await weather_service.fetch_live_weather(
        latitude=settings.PLANT_LATITUDE,
        longitude=settings.PLANT_LONGITUDE
    )
    assert obs is not None
    assert obs.ghi >= 0.0
    assert obs.wind_speed_100m >= 0.0
    assert -50.0 <= obs.temperature_c <= 60.0
    assert 0.0 <= obs.cloud_cover_pct <= 100.0

@pytest.mark.asyncio
async def test_weather_api_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"{settings.API_V1_STR}/weather/current")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "ghi" in data["data"]
        assert "wind_speed_100m" in data["data"]

@pytest.mark.asyncio
async def test_weather_forecast_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"{settings.API_V1_STR}/weather/forecast?horizon_hours=24")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["hourly"]) == 24
        first_hour = data["data"]["hourly"][0]
        assert "estimated_solar_kw" in first_hour
        assert "estimated_wind_kw" in first_hour

@pytest.mark.asyncio
async def test_telemetry_power_balance_and_physics():
    """Verify first-principles energy balance and battery constraints."""
    telemetry = await telemetry_service.compute_live_telemetry()
    
    assert telemetry is not None
    assert telemetry.solar_generation_kw >= 0.0
    assert telemetry.wind_generation_kw >= 0.0
    assert telemetry.demand_load_kw > 0.0
    assert settings.BESS_MIN_SOC_PCT <= telemetry.battery_soc_pct <= settings.BESS_MAX_SOC_PCT
    assert 0.0 <= telemetry.renewable_fraction_pct <= 100.0

    # Power balance check:
    # (Solar to load + Wind to load + Batt to load + Grid to load) must equal Demand
    flow = telemetry.flow
    load_supplied = (
        flow.solar_to_load_kw +
        flow.wind_to_load_kw +
        flow.batt_to_load_kw +
        flow.grid_to_load_kw
    )
    assert abs(load_supplied - telemetry.demand_load_kw) < 0.1, f"Load balance violated: supplied={load_supplied}, demand={telemetry.demand_load_kw}"

@pytest.mark.asyncio
async def test_telemetry_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Live
        res_live = await client.get(f"{settings.API_V1_STR}/telemetry/live")
        assert res_live.status_code == 200
        assert res_live.json()["success"] is True
        
        # History
        res_hist = await client.get(f"{settings.API_V1_STR}/telemetry/history?limit=30")
        assert res_hist.status_code == 200
        hist_data = res_hist.json()["data"]
        assert len(hist_data) <= 30
        assert len(hist_data) > 0
