import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from app.services.digital_twin_service import digital_twin_service
from app.services.anomaly_service import anomaly_service
from app.schemas.digital_twin_schema import StressTestScenarioParams, CapacitySizingRequest

def test_digital_twin_cloud_storm_simulation():
    """Verify physical simulation under 80% solar cloud cover and high wind."""
    params = StressTestScenarioParams(
        scenario_type="CLOUD_COVER_STORM",
        solar_capacity_kw=100.0,
        wind_capacity_kw=100.0,
        battery_capacity_kwh=200.0,
        cloud_attenuation_pct=80.0,
        wind_speed_multiplier=1.4
    )
    res = digital_twin_service.run_stress_test(params)
    assert res is not None
    assert len(res.timesteps) == 24
    assert res.total_solar_kwh >= 0.0
    assert res.total_wind_kwh >= 0.0
    # Every timestep satisfies power flow and SOC limits
    for ts in res.timesteps:
        assert settings.BESS_MIN_SOC_PCT <= ts.battery_soc_pct <= settings.BESS_MAX_SOC_PCT

def test_digital_twin_grid_outage_simulation():
    """Verify islanding resilience scoring when grid is disconnected for 4 hours."""
    params = StressTestScenarioParams(
        scenario_type="GRID_BLACKOUT",
        solar_capacity_kw=100.0,
        wind_capacity_kw=100.0,
        battery_capacity_kwh=200.0,
        initial_soc_pct=85.0,
        grid_outage_hours=[18, 19, 20, 21]
    )
    res = digital_twin_service.run_stress_test(params)
    assert res.horizon_hours == 24
    assert 0.0 <= res.islanding_resilience_score_pct <= 100.0
    for ts in res.timesteps:
        if ts.hour in [18, 19, 20, 21]:
            assert ts.grid_available is False
            assert ts.grid_import_kw == 0.0

def test_digital_twin_capacity_sizing_roi():
    """Verify financial metrics: CAPEX, NPV, Payback, and LCOE."""
    req = CapacitySizingRequest(
        solar_kw=150.0,
        wind_kw=100.0,
        battery_kwh=300.0,
        grid_buy_tariff_inr=8.0
    )
    res = digital_twin_service.calculate_capacity_roi(req)
    assert res.total_capex_inr > 0.0
    assert res.annual_savings_inr > 0.0
    assert res.payback_period_years > 0.0
    assert res.lcoe_inr_per_kwh > 0.0
    assert res.twenty_year_npv_inr > res.ten_year_npv_inr

def test_anomaly_detection_diagnostics():
    """Verify multidimensional anomaly scanner and equipment health indices."""
    res = anomaly_service.scan_telemetry_diagnostics()
    assert res is not None
    assert 0.0 <= res.overall_system_health_index_pct <= 100.0
    assert len(res.equipment_health) == 4
    for eq in res.equipment_health:
        assert eq.health_index_pct >= 0.0
        assert eq.mtbf_hours_estimate > 0

@pytest.mark.asyncio
async def test_digital_twin_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Simulate endpoint
        sim_payload = {
            "scenario_type": "INDUSTRIAL_LOAD_SPIKE",
            "solar_capacity_kw": 100.0,
            "wind_capacity_kw": 100.0,
            "battery_capacity_kwh": 200.0,
            "load_surge_multiplier": 1.8
        }
        res_sim = await client.post(f"{settings.API_V1_STR}/digital-twin/simulate", json=sim_payload)
        assert res_sim.status_code == 200
        assert res_sim.json()["success"] is True
        assert len(res_sim.json()["data"]["timesteps"]) == 24

        # 2. Sizing endpoint
        size_payload = {
            "solar_kw": 200.0,
            "wind_kw": 100.0,
            "battery_kwh": 400.0,
            "grid_buy_tariff_inr": 8.5
        }
        res_size = await client.post(f"{settings.API_V1_STR}/digital-twin/capacity-sizing", json=size_payload)
        assert res_size.status_code == 200
        assert res_size.json()["success"] is True
        assert res_size.json()["data"]["payback_period_years"] > 0

@pytest.mark.asyncio
async def test_anomalies_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"{settings.API_V1_STR}/anomalies/diagnostics")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "equipment_health" in data["data"]
