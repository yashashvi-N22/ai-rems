import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from ml_engine.data.dataset_generator import generate_historical_dataset
from ml_engine.features.feature_extractor import FeatureExtractor
from ml_engine.models.baselines import PersistenceBaseline, SeasonalNaiveBaseline
from ml_engine.models.xgboost_forecaster import XGBoostMultiHorizonForecaster
from ml_engine.models.lstm_forecaster import LSTMForecasterWrapper
from ml_engine.training.evaluate_metrics import calculate_metrics

def train_and_evaluate_all():
    weights_dir = "ml_engine/models/saved_weights"
    os.makedirs(weights_dir, exist_ok=True)
    
    csv_path = "ml_engine/data/processed/microgrid_historical_8760h.csv"
    if not os.path.exists(csv_path):
        df_raw = generate_historical_dataset()
    else:
        df_raw = pd.read_csv(csv_path)

    print(f"Loaded dataset with {len(df_raw)} records. Extracting features...")
    df_feat = FeatureExtractor.extract_features(df_raw)

    domains = [
        ("solar", "solar_generation_kw"),
        ("wind", "wind_generation_kw"),
        ("demand", "demand_load_kw")
    ]

    benchmark_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_hours": len(df_raw),
        "train_hours": int(len(df_raw) * 0.70),
        "test_hours": len(df_raw) - int(len(df_raw) * 0.85),
        "domains": {}
    }

    for domain_name, target_col in domains:
        print(f"\n=======================================================")
        print(f"Training and Benchmarking Models for: {domain_name.upper()} ({target_col})")
        print(f"=======================================================")
        
        feature_cols = FeatureExtractor.get_feature_columns(domain_name)
        X_train, y_train, X_val, y_val, X_test, y_test = FeatureExtractor.prepare_train_val_test_splits(
            df_feat, target_col, feature_cols
        )

        # 1. Baseline Model (Seasonal Naive)
        # Predict on test set using true 24h lag
        y_test_persistence = np.roll(y_test, 1)
        y_test_persistence[0] = y_train[-1]
        y_pred_baseline = np.roll(y_test, 24)
        y_pred_baseline[:24] = y_val[-24:]

        metrics_baseline = calculate_metrics(y_test, y_pred_baseline, y_test_persistence)
        print(f" [Baseline (24h Naive)] MAE: {metrics_baseline['mae']}, RMSE: {metrics_baseline['rmse']}, R2: {metrics_baseline['r2_score']}")

        # 2. XGBoost Model
        print(f" Training Quantile XGBoost Regressors...")
        xgb_forecaster = XGBoostMultiHorizonForecaster(domain_name, feature_cols)
        xgb_forecaster.fit(X_train, y_train, X_val, y_val)
        y_pred_xgb, p10_xgb, p90_xgb = xgb_forecaster.predict(X_test)
        
        metrics_xgb = calculate_metrics(y_test, y_pred_xgb, y_test_persistence)
        print(f" [XGBoost Regressor]   MAE: {metrics_xgb['mae']}, RMSE: {metrics_xgb['rmse']}, R2: {metrics_xgb['r2_score']}, Skill: {metrics_xgb['skill_score_pct']}%")

        # Save XGBoost
        xgb_path = os.path.join(weights_dir, f"xgboost_{domain_name}.joblib")
        xgb_forecaster.save(xgb_path)

        # 3. PyTorch Seq2Seq Bi-LSTM with Attention
        print(f" Training PyTorch Bi-LSTM Seq2Seq...")
        lstm_wrapper = LSTMForecasterWrapper(
            target_name=domain_name,
            input_dim=len(feature_cols),
            horizon=24,
            seq_len=48
        )
        lstm_wrapper.fit(X_train, y_train, epochs=20, batch_size=64, lr=0.004)
        
        # Test evaluation with sliding window
        lstm_preds = []
        for step in range(0, len(X_test) - 24, 24):
            window = X_test[max(0, step - 48) : step] if step >= 48 else np.vstack([X_val[-(48 - step):], X_test[:step]])
            pred_24 = lstm_wrapper.predict(window)
            lstm_preds.extend(pred_24)
        
        # Match length
        lstm_preds = np.array(lstm_preds)[:len(y_test)]
        if len(lstm_preds) < len(y_test):
            pad = np.tile(y_pred_xgb[len(lstm_preds):], 1)
            lstm_preds = np.concatenate([lstm_preds, pad])

        metrics_lstm = calculate_metrics(y_test, lstm_preds, y_test_persistence)
        print(f" [PyTorch Bi-LSTM]     MAE: {metrics_lstm['mae']}, RMSE: {metrics_lstm['rmse']}, R2: {metrics_lstm['r2_score']}, Skill: {metrics_lstm['skill_score_pct']}%")

        # Save LSTM
        lstm_path = os.path.join(weights_dir, f"lstm_{domain_name}.pt")
        lstm_wrapper.save(lstm_path)

        # Store in benchmark report
        feature_importance = xgb_forecaster.get_feature_importances()
        top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:6]

        benchmark_report["domains"][domain_name] = {
            "target_column": target_col,
            "mean_actual_kw": round(float(np.mean(y_test)), 2),
            "max_actual_kw": round(float(np.max(y_test)), 2),
            "models": {
                "Baseline_Seasonal_Naive": metrics_baseline,
                "XGBoost_Quantile": metrics_xgb,
                "PyTorch_BiLSTM_Attention": metrics_lstm
            },
            "top_feature_drivers": [{"feature": k, "importance": round(v, 4)} for k, v in top_features]
        }

    # Save benchmark report
    report_path = os.path.join(weights_dir, "benchmark_report.json")
    with open(report_path, "w") as f:
        json.dump(benchmark_report, f, indent=2)

    print(f"\n=======================================================")
    print(f"All models trained and benchmark report saved to: {report_path}")
    print(f"=======================================================")
    return benchmark_report

if __name__ == "__main__":
    train_and_evaluate_all()
