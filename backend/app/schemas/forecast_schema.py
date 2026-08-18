from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ModelBenchmarkMetrics(BaseModel):
    mae: float = Field(..., description="Mean Absolute Error in kW")
    rmse: float = Field(..., description="Root Mean Squared Error in kW")
    mape_pct: float = Field(..., description="Mean Absolute Percentage Error (%)")
    r2_score: float = Field(..., description="Coefficient of Determination (R^2)")
    skill_score_pct: float = Field(..., description="Skill score vs Persistence Baseline (%)")

class TopFeatureDriver(BaseModel):
    feature: str
    importance: float

class DomainBenchmark(BaseModel):
    target_column: str
    mean_actual_kw: float
    max_actual_kw: float
    models: Dict[str, ModelBenchmarkMetrics]
    top_feature_drivers: List[TopFeatureDriver]

class MultiDomainBenchmarkReport(BaseModel):
    timestamp: datetime
    dataset_hours: int
    train_hours: int
    test_hours: int
    domains: Dict[str, DomainBenchmark]

class HourlyForecastPoint(BaseModel):
    time: datetime
    hour_index: int
    predicted_p50: float
    lower_bound_p10: float
    upper_bound_p90: float
    confidence_interval_width: float

class DomainForecastTrajectory(BaseModel):
    domain: str
    target_unit: str = "kW"
    active_model: str
    capacity_kw: float
    forecast_horizon_hours: int
    hourly_predictions: List[HourlyForecastPoint]

class MultiDomainForecastResponse(BaseModel):
    forecast_generated_at: datetime
    horizon_hours: int
    active_model_name: str
    solar: DomainForecastTrajectory
    wind: DomainForecastTrajectory
    demand: DomainForecastTrajectory
    net_load_p50: List[float]
