import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from app.services.optimizer_service import optimizer_service
from app.schemas.optimizer_schema import OptimizationWeights

def test_milp_solver_power_balance_and_constraints():
    """Verify first-principles physical constraints of the MILP optimal solver."""
    now = datetime.now(timezone.utc)
    solar = [0.0]*6 + [20.0, 45.0, 75.0, 90.0, 85.0, 70.0, 40.0, 15.0] + [0.0]*10 # 24h
    wind = [30.0, 35.0, 40.0, 25.0, 20.0, 30.0, 45.0, 50.0, 35.0, 20.0, 15.0, 25.0] * 2
    demand = [35.0, 32.0, 30.0, 30.0, 35.0, 45.0, 65.0, 80.0, 85.0, 80.0, 75.0, 70.0,
              65.0, 60.0, 65.0, 75.0, 85.0, 95.0, 90.0, 75.0, 60.0, 50.0, 42.0, 38.0]
    timestamps = [now + timedelta(hours=i) for i in range(24)]
    tariffs = [7.5]*18 + [11.0]*4 + [7.5]*2 # Peak tariff in evening

    weights = OptimizationWeights(cost_weight=0.6, carbon_weight=0.2, battery_health_weight=0.2)
    
    res = optimizer_service.solve_optimal_dispatch(
        solar_forecast=solar,
        wind_forecast=wind,
        demand_forecast=demand,
        timestamps=timestamps,
        tariffs=tariffs,
        initial_soc_pct=60.0,
        weights=weights
    )

    assert res is not None
    assert len(res.schedule) == 24
    assert res.kpis.total_cost_inr >= 0.0

    # Verify physical conservation at every hour
    for item in res.schedule:
        # 1. Load Demand Balance
        supplied_to_load = (
            item.solar_to_load_kw +
            item.wind_to_load_kw +
            item.batt_discharge_to_load_kw +
            item.grid_import_to_load_kw
        )
        assert abs(supplied_to_load - item.demand_forecast_kw) < 0.05, f"Hour {item.hour_index}: supplied={supplied_to_load}, demand={item.demand_forecast_kw}"

        # 2. Solar Conservation
        solar_total = item.solar_to_load_kw + item.solar_to_batt_kw + item.solar_to_grid_kw + item.solar_curtailed_kw
        assert abs(solar_total - item.solar_forecast_kw) < 0.05

        # 3. Wind Conservation
        wind_total = item.wind_to_load_kw + item.wind_to_batt_kw + item.wind_to_grid_kw + item.wind_curtailed_kw
        assert abs(wind_total - item.wind_forecast_kw) < 0.05

        # 4. Battery SOC bounds
        assert settings.BESS_MIN_SOC_PCT <= item.battery_soc_pct <= settings.BESS_MAX_SOC_PCT + 0.1

        # 5. Mutex: No concurrent charge and discharge
        is_charging = (item.solar_to_batt_kw + item.wind_to_batt_kw + item.grid_import_to_batt_kw) > 0.1
        is_discharging = item.batt_discharge_to_load_kw > 0.1
        assert not (is_charging and is_discharging), f"Hour {item.hour_index}: Concurrent charge and discharge detected!"

def test_milp_cost_savings_vs_rule_based():
    """Verify MILP lookahead achieves financial savings compared to unmanaged heuristic."""
    now = datetime.now(timezone.utc)
    solar = [0.0]*6 + [50.0, 80.0, 90.0, 95.0, 85.0, 60.0, 25.0] + [0.0]*11
    wind = [20.0]*24
    demand = [40.0]*18 + [90.0]*4 + [40.0]*2 # Evening peak at hour 18-22
    timestamps = [now + timedelta(hours=i) for i in range(24)]
    tariffs = [6.0]*18 + [12.0]*4 + [6.0]*2 # Peak evening tariff ₹12 vs ₹6

    res = optimizer_service.solve_optimal_dispatch(
        solar_forecast=solar,
        wind_forecast=wind,
        demand_forecast=demand,
        timestamps=timestamps,
        tariffs=tariffs,
        initial_soc_pct=50.0
    )

    # Lookahead optimizer pre-charges battery during cheap daytime hours and discharges during peak ₹12/kWh hours
    assert res.kpis.total_cost_inr <= res.comparison_vs_baseline.rule_based_cost_inr
    assert res.comparison_vs_baseline.cost_savings_inr >= 0.0

@pytest.mark.asyncio
async def test_optimizer_schedule_api_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"{settings.API_V1_STR}/optimizer/schedule?cost_weight=0.7&carbon_weight=0.2&battery_health_weight=0.1")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]["schedule"]) == 24
        assert "kpis" in data["data"]
        assert "comparison_vs_baseline" in data["data"]

@pytest.mark.asyncio
async def test_optimizer_solve_api_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "cost_weight": 0.4,
            "carbon_weight": 0.4,
            "battery_health_weight": 0.2
        }
        res = await client.post(f"{settings.API_V1_STR}/optimizer/solve?initial_soc_pct=75.0", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["initial_soc_pct"] == 75.0
        assert data["data"]["weights"]["carbon_weight"] == 0.4
