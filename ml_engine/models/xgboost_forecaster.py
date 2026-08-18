import os
import joblib
import numpy as np
from typing import Dict, List, Tuple, Optional
import xgboost as xgb

class XGBoostMultiHorizonForecaster:
    """
    Quantile Gradient Boosted Decision Tree Forecaster for point predictions and P10-P90 uncertainty intervals.
    """
    def __init__(self, target_name: str, feature_names: List[str]):
        self.target_name = target_name
        self.feature_names = feature_names
        
        # Point Forecaster (Mean / L2)
        self.model_point = xgb.XGBRegressor(
            n_estimators=150,
            learning_rate=0.06,
            max_depth=6,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1
        )

        # Probabilistic Lower Bound P10
        self.model_p10 = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.06,
            max_depth=5,
            subsample=0.85,
            objective="reg:quantileerror",
            quantile_alpha=0.10,
            random_state=42,
            n_jobs=-1
        )

        # Probabilistic Upper Bound P90
        self.model_p90 = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.06,
            max_depth=5,
            subsample=0.85,
            objective="reg:quantileerror",
            quantile_alpha=0.90,
            random_state=42,
            n_jobs=-1
        )

    def fit(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray):
        """Train point and quantile models with early stopping on validation split."""
        self.model_point.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )
        self.model_p10.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )
        self.model_p90.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Infers point forecast (P50), lower bound (P10), and upper bound (P90).
        """
        p50 = np.maximum(0.0, self.model_point.predict(X))
        p10 = np.maximum(0.0, self.model_p10.predict(X))
        p90 = np.maximum(p50, self.model_p90.predict(X))
        p10 = np.minimum(p10, p50) # enforce monotonicity
        return p50, p10, p90

    def get_feature_importances(self) -> Dict[str, float]:
        """Return normalized Gain feature importance scores."""
        scores = self.model_point.feature_importances_
        return {feat: float(score) for feat, score in zip(self.feature_names, scores)}

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        artifact = {
            "target_name": self.target_name,
            "feature_names": self.feature_names,
            "model_point": self.model_point,
            "model_p10": self.model_p10,
            "model_p90": self.model_p90
        }
        joblib.dump(artifact, filepath)

    @classmethod
    def load(cls, filepath: str) -> 'XGBoostMultiHorizonForecaster':
        artifact = joblib.load(filepath)
        instance = cls(artifact["target_name"], artifact["feature_names"])
        instance.model_point = artifact["model_point"]
        instance.model_p10 = artifact["model_p10"]
        instance.model_p90 = artifact["model_p90"]
        return instance
