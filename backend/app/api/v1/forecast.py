from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas.common import ApiResponse
from app.schemas.forecast_schema import (
    MultiDomainBenchmarkReport,
    MultiDomainForecastResponse
)
from app.services.forecast_service import forecast_service

router = APIRouter(prefix="/forecast", tags=["AI/ML Multi-Horizon Forecasting"])

@router.get("/models", response_model=ApiResponse[List[dict]])
async def list_forecasting_models():
    """List registered progressive forecasting models."""
    models = [
        {
            "model_id": "Baseline_Seasonal_Naive",
            "name": "24-Hour Lagged Seasonal Naive",
            "type": "Statistical Baseline",
            "complexity": "O(1)",
            "description": "Standard baseline projecting preceding 24-hour diurnal cycle."
        },
        {
            "model_id": "XGBoost_Quantile",
            "name": "Multi-Quantile XGBoost Regressor (P10, P50, P90)",
            "type": "Gradient Boosted Decision Trees",
            "complexity": "Fast (Sub-second)",
            "description": "Multi-quantile ensemble capturing non-linear meteorological interactions and confidence bands."
        },
        {
            "model_id": "PyTorch_BiLSTM_Attention",
            "name": "PyTorch Bidirectional LSTM with Multi-Head Self-Attention",
            "type": "Deep Sequence-to-Sequence Neural Network",
            "complexity": "Deep Learning",
            "description": "Bidirectional recurrent architecture with self-attention mapping 48h temporal context to 24h horizon."
        }
    ]
    return ApiResponse(
        success=True,
        message="Registered forecasting model zoo retrieved",
        data=models
    )

@router.get("/benchmark", response_model=ApiResponse[dict])
async def get_forecast_benchmark():
    """
    Retrieve empirical cross-validated model evaluation benchmark matrix (MAE, RMSE, MAPE, R^2, Skill Scores).
    """
    report = forecast_service.get_benchmark_report()
    return ApiResponse(
        success=True,
        message="Model evaluation benchmark leaderboard retrieved",
        data=report
    )

@router.get("/predict", response_model=ApiResponse[MultiDomainForecastResponse])
async def get_multi_domain_forecast(
    model: str = Query("XGBoost_Quantile", description="Selected forecasting model (Baseline_Seasonal_Naive, XGBoost_Quantile, PyTorch_BiLSTM_Attention)"),
    horizon_hours: int = Query(24, ge=1, le=48, description="Prediction horizon in hours (1-48)")
):
    """
    Generate 24-hour ahead multi-domain forecasts for Solar, Wind, Demand, and Net Load with P10/P90 confidence intervals.
    """
    predictions = await forecast_service.generate_24h_forecast(
        model_preference=model,
        horizon_hours=horizon_hours
    )
    return ApiResponse(
        success=True,
        message=f"24-hour multi-domain forecast generated using {model}",
        data=predictions
    )
