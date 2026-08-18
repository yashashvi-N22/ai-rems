import math
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict

class FeatureExtractor:
    """
    Feature engineering pipeline for Solar PV, Wind Turbine, and Electrical Load multi-horizon forecasting.
    """

    @staticmethod
    def extract_features(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        # 1. Cyclical Time Features
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)
        df["weekday_sin"] = np.sin(2 * np.pi * df["weekday"] / 7.0)
        df["weekday_cos"] = np.cos(2 * np.pi * df["weekday"] / 7.0)

        # 2. Solar Physics Features
        # Air density rho (kg/m3) = P / (R_spec * T_k)
        t_kelvin = df["temperature_c"] + 273.15
        df["air_density_kg_m3"] = (df["surface_pressure_hpa"] * 100.0) / (287.05 * t_kelvin)
        
        # Extraterrestrial Radiation & Clearness Index
        day_of_year = df["day_of_year"]
        i_ext = 1367.0 * (1.0 + 0.033 * np.cos(2 * np.pi * day_of_year / 365.0))
        cos_zenith = np.maximum(0.0, np.cos(np.radians(df["zenith_deg"])))
        df["clearness_index"] = np.where(cos_zenith > 0.05, df["ghi"] / (i_ext * cos_zenith + 1e-5), 0.0)
        df["clearness_index"] = np.clip(df["clearness_index"], 0.0, 1.2)
        
        # Estimated PV Cell Temperature
        df["cell_temp_c"] = df["temperature_c"] + (df["ghi"] * (45.0 - 20.0) / 800.0)

        # 3. Wind Aerodynamic Features
        df["wind_dir_sin"] = np.sin(np.radians(df["wind_direction_deg"]))
        df["wind_dir_cos"] = np.cos(np.radians(df["wind_direction_deg"]))
        df["wind_kinetic_cube"] = (df["wind_speed_100m"] ** 3) * df["air_density_kg_m3"] * 0.5

        # 4. Temperature Sensitivity & Degree Days
        df["cdd_cooling_deg"] = np.maximum(0.0, df["temperature_c"] - 22.0)
        df["hdd_heating_deg"] = np.maximum(0.0, 18.0 - df["temperature_c"])

        # 5. Autoregressive Lags & Rolling Statistics
        for target in ["solar_generation_kw", "wind_generation_kw", "demand_load_kw"]:
            prefix = target.split("_")[0] # 'solar', 'wind', 'demand'
            df[f"{prefix}_lag1"] = df[target].shift(1)
            df[f"{prefix}_lag2"] = df[target].shift(2)
            df[f"{prefix}_lag24"] = df[target].shift(24)
            df[f"{prefix}_rolling_mean6"] = df[target].shift(1).rolling(window=6, min_periods=1).mean()
            df[f"{prefix}_rolling_mean24"] = df[target].shift(1).rolling(window=24, min_periods=1).mean()
            df[f"{prefix}_rolling_std24"] = df[target].shift(1).rolling(window=24, min_periods=1).std().fillna(0.0)

        df["demand_lag168"] = df["demand_load_kw"].shift(168).fillna(df["demand_load_kw"].mean())

        # Drop initial NaN rows created by 24h/168h lags
        df = df.bfill().ffill()
        return df

    @staticmethod
    def get_feature_columns(target_type: str) -> List[str]:
        """Return the precise feature subset tailored to the target domain."""
        common_time = ["hour_sin", "hour_cos", "month_sin", "month_cos", "weekday_sin", "weekday_cos", "is_weekend"]
        
        if target_type == "solar":
            return common_time + [
                "zenith_deg", "cloud_cover_pct", "temperature_c", "relative_humidity",
                "ghi", "dni", "dhi", "clearness_index", "cell_temp_c",
                "solar_lag1", "solar_lag2", "solar_lag24", "solar_rolling_mean6", "solar_rolling_mean24"
            ]
        elif target_type == "wind":
            return common_time + [
                "wind_speed_10m", "wind_speed_100m", "wind_dir_sin", "wind_dir_cos",
                "wind_kinetic_cube", "air_density_kg_m3", "surface_pressure_hpa",
                "wind_lag1", "wind_lag2", "wind_lag24", "wind_rolling_mean6", "wind_rolling_mean24", "wind_rolling_std24"
            ]
        elif target_type == "demand":
            return common_time + [
                "temperature_c", "relative_humidity", "cdd_cooling_deg", "hdd_heating_deg",
                "demand_lag1", "demand_lag2", "demand_lag24", "demand_lag168",
                "demand_rolling_mean6", "demand_rolling_mean24", "demand_rolling_std24"
            ]
        else:
            raise ValueError(f"Unknown target_type: {target_type}")

    @classmethod
    def prepare_train_val_test_splits(
        cls, df: pd.DataFrame, target_col: str, feature_cols: List[str]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Split into 70% train, 15% val, 15% test chronologically."""
        n = len(df)
        train_end = int(n * 0.70)
        val_end = int(n * 0.85)

        X = df[feature_cols].values
        y = df[target_col].values

        X_train, y_train = X[:train_end], y[:train_end]
        X_val, y_val = X[train_end:val_end], y[train_end:val_end]
        X_test, y_test = X[val_end:], y[val_end:]

        return X_train, y_train, X_val, y_val, X_test, y_test
