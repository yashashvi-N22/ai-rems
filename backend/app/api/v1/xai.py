from fastapi import APIRouter, Query
from app.schemas.common import ApiResponse
from ml_engine.explainability.shap_explainer import shap_engine

router = APIRouter(prefix="/xai", tags=["Explainable AI (TreeSHAP)"])

@router.get("/global-importance", response_model=ApiResponse[list])
async def get_global_importance(
    domain: str = Query("solar", description="solar, wind, demand")
):
    """
    Retrieve global TreeSHAP feature importance rankings and percentage contributions.
    """
    data = shap_engine.get_global_feature_importance(domain)
    return ApiResponse(
        success=True,
        message=f"Global TreeSHAP feature importance for {domain} retrieved successfully",
        data=data
    )

@router.get("/local-waterfall", response_model=ApiResponse[dict])
async def get_local_waterfall(
    domain: str = Query("solar", description="solar, wind, demand"),
    hour_index: int = Query(12, ge=1, le=24, description="Target forecast hour 1-24")
):
    """
    Retrieve localized TreeSHAP waterfall feature contributions for a specific hourly forecast point.
    """
    data = shap_engine.get_local_waterfall(domain, hour_index)
    return ApiResponse(
        success=True,
        message=f"Local TreeSHAP waterfall breakdown for {domain} at hour {hour_index} retrieved successfully",
        data=data
    )
