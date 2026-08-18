import numpy as np
from typing import Dict

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_persistence: np.ndarray = None) -> Dict[str, float]:
    """
    Standardized benchmark metrics evaluation across MAE, RMSE, MAPE, R^2, and Skill Score.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    
    # 1. MAE
    mae = float(np.mean(np.abs(y_true - y_pred)))
    
    # 2. RMSE
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    
    # 3. MAPE (with epsilon threshold to avoid zero division during night hours)
    mask = y_true > 1.0
    if np.sum(mask) > 0:
        mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)
    else:
        mape = 0.0

    # 4. R^2 Score
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = float(1.0 - (ss_res / max(1e-5, ss_tot)))

    # 5. Skill Score vs Persistence
    if y_persistence is not None:
        rmse_pers = np.sqrt(np.mean((y_true - y_persistence) ** 2))
        skill = float(1.0 - (rmse / max(1e-5, rmse_pers))) * 100.0
    else:
        skill = 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_pct": round(mape, 2),
        "r2_score": round(max(-1.0, min(1.0, r2)), 4),
        "skill_score_pct": round(max(-100.0, min(100.0, skill)), 2)
    }
