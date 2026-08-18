import pytest
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from ml_engine.features.feature_extractor import FeatureExtractor
from ml_engine.models.baselines import PersistenceBaseline, SeasonalNaiveBaseline
from ml_engine.models.xgboost_forecaster import XGBoostMultiHorizonForecaster
from ml_engine.training.evaluate_metrics import calculate_metrics

def test_feature_extractor():
    """Verify feature engineering calculations and NaN safety."""
    # Synthetic sample data
    df = pd.DataFrame({
        "hour": list(range(24)) * 3,
        "month": [5] * 72,
        "weekday": [1] * 72,
        "is_weekend": [0] * 72,
        "day_of_year": [120] * 72,
        "zenith_deg": [45.0] * 72,
        "cloud_cover_pct": [20.0] * 72,
        "temperature_c": [28.0] * 72,
        "relative_humidity": [50.0] * 72,
        "surface_pressure_hpa": [1012.0] * 72,
        "ghi": [600.0] * 72,
        "dni": [700.0] * 72,
        "dhi": [100.0] * 72,
        "wind_speed_10m": [5.0] * 72,
        "wind_speed_100m": [7.5] * 72,
        "wind_direction_deg": [180.0] * 72,
        "solar_generation_kw": [50.0] * 72,
        "wind_generation_kw": [40.0] * 72,
        "demand_load_kw": [60.0] * 72
    })

    df_feat = FeatureExtractor.extract_features(df)
    assert not df_feat.isnull().values.any(), "Extracted features contain NaN values"
    assert "clearness_index" in df_feat.columns
    assert "air_density_kg_m3" in df_feat.columns
    assert "cell_temp_c" in df_feat.columns
    assert "wind_kinetic_cube" in df_feat.columns

def test_baseline_forecaster():
    """Verify persistence and seasonal naive baselines."""
    history = np.array([10.0, 20.0, 30.0, 40.0] * 6) # 24 points
    
    # Persistence
    pers = PersistenceBaseline()
    pers_preds = pers.predict(history, horizon=12)
    assert len(pers_preds) == 12
    assert np.all(pers_preds == 40.0)

    # 24h Seasonal Naive
    naive = SeasonalNaiveBaseline(season_length=24)
    naive_preds = naive.predict(history, horizon=24)
    assert len(naive_preds) == 24
    assert np.array_equal(naive_preds, history)

def test_xgboost_quantile_monotonicity():
    """Verify that XGBoost quantile forecasts satisfy P10 <= P50 <= P90."""
    np.random.seed(42)
    X = np.random.randn(200, 5)
    y = X[:, 0] * 2.0 + X[:, 1] * 1.5 + np.random.normal(0, 0.5, 200)

    forecaster = XGBoostMultiHorizonForecaster(
        target_name="test_target",
        feature_names=["f0", "f1", "f2", "f3", "f4"]
    )
    forecaster.fit(X[:150], y[:150], X[150:], y[150:])
    p50, p10, p90 = forecaster.predict(X[150:])

    assert len(p50) == 50
    assert np.all(p10 <= p50), "P10 lower bound exceeds P50 point forecast"
    assert np.all(p50 <= p90), "P50 point forecast exceeds P90 upper bound"

def test_metrics_calculation():
    """Verify MAE, RMSE, MAPE, R2, and Skill score arithmetic."""
    y_true = np.array([10.0, 20.0, 30.0, 40.0])
    y_pred = np.array([12.0, 18.0, 31.0, 39.0])
    y_pers = np.array([10.0, 10.0, 20.0, 30.0])

    metrics = calculate_metrics(y_true, y_pred, y_pers)
    assert metrics["mae"] == 1.5
    assert metrics["rmse"] > 0.0
    assert metrics["r2_score"] > 0.90
    assert metrics["skill_score_pct"] > 0.0

@pytest.mark.asyncio
async def test_forecast_models_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"{settings.API_V1_STR}/forecast/models")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["data"]) == 3
        model_ids = [m["model_id"] for m in data["data"]]
        assert "Baseline_Seasonal_Naive" in model_ids
        assert "XGBoost_Quantile" in model_ids
        assert "PyTorch_BiLSTM_Attention" in model_ids

@pytest.mark.asyncio
async def test_forecast_benchmark_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"{settings.API_V1_STR}/forecast/benchmark")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "domains" in data["data"]
        domains = data["data"]["domains"]
        assert "solar" in domains
        assert "wind" in domains
        assert "demand" in domains
        
        # Check XGBoost vs Baseline for Solar
        solar_models = domains["solar"]["models"]
        assert "XGBoost_Quantile" in solar_models
        assert "Baseline_Seasonal_Naive" in solar_models
        assert solar_models["XGBoost_Quantile"]["rmse"] < solar_models["Baseline_Seasonal_Naive"]["rmse"]

@pytest.mark.asyncio
async def test_forecast_predict_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"{settings.API_V1_STR}/forecast/predict?model=XGBoost_Quantile&horizon_hours=24")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        forecast = data["data"]
        
        assert len(forecast["solar"]["hourly_predictions"]) == 24
        assert len(forecast["wind"]["hourly_predictions"]) == 24
        assert len(forecast["demand"]["hourly_predictions"]) == 24
        assert len(forecast["net_load_p50"]) == 24
        
        # Verify first point bounds
        first_solar = forecast["solar"]["hourly_predictions"][0]
        assert first_solar["lower_bound_p10"] <= first_solar["predicted_p50"] <= first_solar["upper_bound_p90"]
