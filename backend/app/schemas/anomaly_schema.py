from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class AnomalyAlert(BaseModel):
    id: str
    timestamp: datetime
    equipment: str # "SOLAR_PV", "WIND_TURBINE", "BESS_STORAGE", "GRID_INTERFACE", "SENSOR_BUS"
    anomaly_type: str
    severity: str # "CRITICAL", "WARNING", "INFO"
    confidence_score: float # 0.0 to 1.0
    detected_value: float
    expected_nominal_range: str
    root_cause_analysis: str
    recommended_maintenance_action: str

class EquipmentHealthScore(BaseModel):
    equipment: str
    health_index_pct: float # 0 to 100%
    status: str # "OPTIMAL", "FAIR", "DEGRADED", "CRITICAL"
    key_degradation_factor: str
    mtbf_hours_estimate: int
    last_serviced_date: str

class AnomalyDiagnosticResponse(BaseModel):
    scanned_at: datetime
    overall_system_health_index_pct: float
    active_anomaly_count: int
    critical_alerts_count: int
    equipment_health: List[EquipmentHealthScore]
    active_alerts: List[AnomalyAlert]
