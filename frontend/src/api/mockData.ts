import { MicrogridLiveTelemetry, WeatherObservation, MicrogridHistoryPoint } from '../types/microgrid';
import { ModelBenchmarkData, MultiDomainForecast, OptimizationResponse, AnomalyDiagnosticResponse, RLBenchmarkResponse } from './client';

export const mockInitialWeather: WeatherObservation = {
  timestamp: new Date().toISOString(),
  location_name: "Hadapsar Clean Energy Hub, Pune, Maharashtra",
  latitude: 18.5089,
  longitude: 73.9260,
  temperature_c: 28.4,
  relative_humidity: 62.0,
  surface_pressure_hpa: 948.2,
  cloud_cover_pct: 22.0,
  precipitation_mm: 0.0,
  ghi: 685.0,
  dni: 540.0,
  dhi: 145.0,
  wind_speed_10m: 4.8,
  wind_speed_100m: 8.9,
  wind_direction_deg: 265.0,
  wind_gusts_10m: 11.2,
  source: "OPEN_METEO_LIVE_API"
};

export const mockInitialTelemetry: MicrogridLiveTelemetry = {
  timestamp: new Date().toISOString(),
  system_id: "HADAPSAR-HUB-01",
  solar_generation_kw: 68.5,
  wind_generation_kw: 42.1,
  total_renewable_generation_kw: 110.6,
  demand_load_kw: 85.0,
  net_load_kw: -25.6,
  battery_soc_pct: 68.4,
  battery_power_kw: -22.5, // Charging
  battery_status: 'CHARGING',
  battery_temperature_c: 29.5,
  battery_soh_pct: 99.2,
  grid_import_kw: 0.0,
  grid_export_kw: 3.1,
  grid_status: 'EXPORTING',
  grid_tariff_inr: 7.50,
  renewable_fraction_pct: 100.0,
  carbon_avoided_kg_per_hr: 34.5,
  current_cost_rate_inr_per_hr: 12.50,
  flow: {
    solar_to_load_kw: 55.0,
    solar_to_batt_kw: 13.5,
    solar_to_grid_kw: 0.0,
    solar_curtailed_kw: 0.0,
    wind_to_load_kw: 30.0,
    wind_to_batt_kw: 9.0,
    wind_to_grid_kw: 3.1,
    wind_curtailed_kw: 0.0,
    batt_to_load_kw: 0.0,
    grid_to_load_kw: 0.0,
    grid_to_batt_kw: 0.0
  },
  weather_summary: {
    ghi: 685.0,
    dni: 540.0,
    wind_speed_100m: 8.9,
    temperature_c: 28.4,
    cloud_cover_pct: 22.0,
    source: "OPEN_METEO_LIVE_API"
  },
  is_simulated: false
};

export const generateMockHistory = (count = 50): MicrogridHistoryPoint[] => {
  const points: MicrogridHistoryPoint[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * 30000).toISOString();
    points.push({
      timestamp: t,
      solar_kw: Math.max(0, 68 + Math.sin(i * 0.2) * 5),
      wind_kw: Math.max(0, 42 + Math.cos(i * 0.3) * 8),
      demand_kw: 85 + Math.sin(i * 0.1) * 6,
      battery_soc_pct: Math.min(95, Math.max(15, 68 + (50 - i) * 0.1)),
      battery_power_kw: -22.5 + Math.sin(i * 0.2) * 4,
      grid_import_kw: 0.0,
      grid_export_kw: 3.1 + Math.max(0, Math.sin(i * 0.2) * 2),
      renewable_fraction_pct: 100.0
    });
  }
  return points;
};

export const mockForecastData: MultiDomainForecast = {
  forecast_generated_at: new Date().toISOString(),
  horizon_hours: 24,
  active_model_name: "XGBoost_Quantile",
  solar: {
    domain: "solar",
    target_unit: "kW",
    capacity_kw: 100,
    hourly_predictions: Array.from({ length: 24 }).map((_, h) => {
      const isDay = h >= 6 && h <= 18;
      const p50 = isDay ? Math.sin(((h - 6) / 12) * Math.PI) * 92 : 0;
      return {
        time: `${String(h).padStart(2, '0')}:00`,
        hour_index: h,
        predicted_p50: p50,
        lower_bound_p10: p50 * 0.85,
        upper_bound_p90: p50 * 1.12,
        confidence_interval_width: p50 * 0.27
      };
    })
  },
  wind: {
    domain: "wind",
    target_unit: "kW",
    capacity_kw: 100,
    hourly_predictions: Array.from({ length: 24 }).map((_, h) => {
      const p50 = 35 + Math.sin(h * 0.5) * 18;
      return {
        time: `${String(h).padStart(2, '0')}:00`,
        hour_index: h,
        predicted_p50: p50,
        lower_bound_p10: p50 * 0.82,
        upper_bound_p90: p50 * 1.18,
        confidence_interval_width: p50 * 0.36
      };
    })
  },
  demand: {
    domain: "demand",
    target_unit: "kW",
    capacity_kw: 150,
    hourly_predictions: Array.from({ length: 24 }).map((_, h) => {
      const p50 = 60 + (h >= 9 && h <= 18 ? 35 : h >= 18 && h <= 22 ? 45 : 10);
      return {
        time: `${String(h).padStart(2, '0')}:00`,
        hour_index: h,
        predicted_p50: p50,
        lower_bound_p10: p50 * 0.92,
        upper_bound_p90: p50 * 1.08,
        confidence_interval_width: p50 * 0.16
      };
    })
  },
  net_load_p50: Array.from({ length: 24 }).map((_, h) => {
    const isDay = h >= 6 && h <= 18;
    const s = isDay ? Math.sin(((h - 6) / 12) * Math.PI) * 92 : 0;
    const w = 35 + Math.sin(h * 0.5) * 18;
    const d = 60 + (h >= 9 && h <= 18 ? 35 : h >= 18 && h <= 22 ? 45 : 10);
    return d - (s + w);
  })
};

export const mockBenchmarkData: ModelBenchmarkData = {
  timestamp: new Date().toISOString(),
  dataset_hours: 8760,
  train_hours: 7008,
  test_hours: 1752,
  domains: {
    solar: {
      target_column: "solar_generation_kw",
      mean_actual_kw: 28.5,
      max_actual_kw: 98.4,
      models: {
        Persistence_Baseline: { mae: 5.42, rmse: 7.74, mape_pct: 18.2, r2_score: 0.940, skill_score_pct: 0.0 },
        PyTorch_BiLSTM_Attention: { mae: 1.12, rmse: 1.64, mape_pct: 4.8, r2_score: 0.9972, skill_score_pct: 78.8 },
        XGBoost_Quantile: { mae: 0.18, rmse: 0.24, mape_pct: 0.95, r2_score: 0.9999, skill_score_pct: 96.9 }
      },
      top_feature_drivers: [
        { feature: "direct_normal_irradiance", importance: 0.624 },
        { feature: "diffuse_radiation", importance: 0.142 },
        { feature: "clearness_index_kt", importance: 0.088 },
        { feature: "pv_cell_temp_c", importance: 0.065 }
      ]
    },
    wind: {
      target_column: "wind_generation_kw",
      mean_actual_kw: 41.2,
      max_actual_kw: 99.1,
      models: {
        Persistence_Baseline: { mae: 6.80, rmse: 9.12, mape_pct: 22.4, r2_score: 0.892, skill_score_pct: 0.0 },
        PyTorch_BiLSTM_Attention: { mae: 1.45, rmse: 2.10, mape_pct: 5.2, r2_score: 0.9945, skill_score_pct: 77.0 },
        XGBoost_Quantile: { mae: 0.22, rmse: 0.31, mape_pct: 1.10, r2_score: 0.9998, skill_score_pct: 96.6 }
      },
      top_feature_drivers: [
        { feature: "wind_speed_100m", importance: 0.585 },
        { feature: "kinetic_wind_proxy_v3", importance: 0.224 },
        { feature: "air_density_kg_m3", importance: 0.098 }
      ]
    },
    demand: {
      target_column: "campus_demand_kw",
      mean_actual_kw: 74.8,
      max_actual_kw: 135.0,
      models: {
        Persistence_Baseline: { mae: 8.10, rmse: 11.4, mape_pct: 14.5, r2_score: 0.910, skill_score_pct: 0.0 },
        PyTorch_BiLSTM_Attention: { mae: 1.80, rmse: 2.65, mape_pct: 3.9, r2_score: 0.9921, skill_score_pct: 76.8 },
        XGBoost_Quantile: { mae: 0.35, rmse: 0.48, mape_pct: 0.85, r2_score: 0.9996, skill_score_pct: 95.8 }
      },
      top_feature_drivers: [
        { feature: "demand_lag_24h", importance: 0.512 },
        { feature: "cooling_degree_days", importance: 0.235 },
        { feature: "demand_lag_168h", importance: 0.145 }
      ]
    }
  }
};

export const mockOptimizationSchedule: OptimizationResponse = {
  generated_at: new Date().toISOString(),
  horizon_hours: 24,
  optimization_mode: "COST_MINIMIZATION",
  weights: { cost_weight: 0.5, carbon_weight: 0.3, battery_health_weight: 0.2 },
  initial_soc_pct: 65.0,
  schedule: Array.from({ length: 24 }).map((_, h) => {
    const isDay = h >= 6 && h <= 18;
    const isPeak = h >= 18 && h <= 22;
    const isOffPeak = h >= 0 && h <= 6;
    const solar = isDay ? Math.sin(((h - 6) / 12) * Math.PI) * 90 : 0;
    const wind = 35 + Math.sin(h * 0.4) * 15;
    const demand = 60 + (isPeak ? 45 : isDay ? 30 : 10);
    const tariff = isPeak ? 11.0 : isOffPeak ? 6.40 : 7.50;
    const battDischarge = isPeak ? 45.0 : 0.0;
    const soc = isPeak ? 85 - (h - 18) * 15 : isDay ? 35 + (h - 6) * 4 : 45;
    return {
      hour_index: h,
      time: `${String(h).padStart(2, '0')}:00`,
      tariff_inr_kwh: tariff,
      solar_forecast_kw: solar,
      wind_forecast_kw: wind,
      demand_forecast_kw: demand,
      solar_to_load_kw: Math.min(solar, demand),
      solar_to_batt_kw: Math.max(0, solar - demand),
      solar_to_grid_kw: 0.0,
      solar_curtailed_kw: 0.0,
      wind_to_load_kw: Math.min(wind, Math.max(0, demand - solar)),
      wind_to_batt_kw: Math.max(0, wind - Math.max(0, demand - solar)),
      wind_to_grid_kw: 0.0,
      wind_curtailed_kw: 0.0,
      batt_discharge_to_load_kw: battDischarge,
      grid_import_to_load_kw: isPeak ? Math.max(0, demand - (wind + battDischarge)) : 0,
      grid_import_to_batt_kw: isOffPeak ? 20.0 : 0,
      battery_soc_pct: Math.min(95, Math.max(15, soc)),
      net_grid_exchange_kw: isPeak ? Math.max(0, demand - (wind + battDischarge)) : 0,
      hourly_cost_inr: (demand * tariff) * 0.8,
      hourly_co2_kg: 5.5
    };
  }),
  kpis: {
    total_cost_inr: 1184.20,
    total_grid_import_kwh: 145.0,
    total_grid_export_kwh: 22.0,
    total_co2_emissions_kg: 138.0,
    total_co2_avoided_kg: 34.5,
    renewable_utilization_pct: 98.5,
    battery_equivalent_full_cycles: 0.85,
    peak_demand_kw: 105.0,
    solver_status: "OPTIMAL",
    solve_time_ms: 4.2
  },
  comparison_vs_baseline: {
    rule_based_cost_inr: 1480.50,
    milp_cost_inr: 1184.20,
    cost_savings_inr: 296.30,
    cost_savings_pct: 20.02,
    rule_based_co2_kg: 172.5,
    milp_co2_kg: 138.0,
    co2_reduction_kg: 34.5,
    co2_reduction_pct: 20.0,
    rule_based_grid_import_kwh: 210.0,
    milp_grid_import_kwh: 145.0,
    grid_import_reduction_kwh: 65.0
  }
};

export const mockDiagnosticsReport: AnomalyDiagnosticResponse = {
  scanned_at: new Date().toISOString(),
  overall_system_health_index_pct: 96.9,
  active_anomaly_count: 1,
  critical_alerts_count: 0,
  equipment_health: [
    { name: "Solar PV Array", health_pct: 95.5, status: "HEALTHY", mtbf_hours: 18400 },
    { name: "Wind Turbine Nacelle", health_pct: 97.2, status: "HEALTHY", mtbf_hours: 12200 },
    { name: "BESS Storage Rack", health_pct: 98.4, status: "HEALTHY", mtbf_hours: 25000 },
    { name: "Grid Transformer Substation", health_pct: 96.5, status: "HEALTHY", mtbf_hours: 45000 }
  ],
  active_alerts: [
    {
      subsystem: "SOLAR_PV",
      severity: "WARNING",
      metric_name: "Dust Soiling Ratio",
      observed_value: 0.88,
      expected_value: 1.0,
      timestamp: new Date().toISOString(),
      recommendation: "Schedule automated robotic dry wiper cleaning cycle in 48 hours."
    }
  ]
};

export const mockRLBenchmark: RLBenchmarkResponse = {
  evaluation_period: "24-Hour Horizon (100 kW Solar + 100 kW Wind + 200 kWh BESS)",
  strategies: {
    rule_based: {
      total_cost_inr: 1480.50,
      cost_savings_pct: 0.0,
      co2_emissions_kg: 172.5,
      renewable_utilization_pct: 78.4,
      battery_full_cycles: 1.42,
      inference_latency_ms: 0.02,
      description: "Greedy heuristic charging on surplus, discharging on deficit."
    },
    ppo_reinforcement_learning: {
      total_cost_inr: 1228.40,
      cost_savings_pct: 17.03,
      co2_emissions_kg: 144.2,
      renewable_utilization_pct: 86.2,
      battery_full_cycles: 0.92,
      inference_latency_ms: 0.35,
      description: "Continuous Actor-Critic PPO policy for sub-second real-time grid stabilization."
    },
    deterministic_milp: {
      total_cost_inr: 1184.20,
      cost_savings_pct: 20.02,
      co2_emissions_kg: 138.0,
      renewable_utilization_pct: 92.4,
      battery_full_cycles: 0.85,
      inference_latency_ms: 4.20,
      description: "Google OR-Tools CBC/HiGHS mathematical global optimum schedule."
    }
  },
  key_takeaways: [
    "PPO RL captures 85% of theoretical MILP global optimum savings while inferring in just 0.35 ms (12x faster).",
    "Both PPO and MILP achieve 0.0 kWh unserved load and 0.0 kWh clean energy curtailment.",
    "PPO preserves battery longevity with only 0.92 EFC/day compared to 1.42 EFC for heuristic cycling."
  ]
};

export const mockTreeShapGlobal = [
  { feature: "direct_normal_irradiance", mean_abs_shap: 18.42, relative_importance_pct: 62.4 },
  { feature: "diffuse_radiation", mean_abs_shap: 4.18, relative_importance_pct: 14.2 },
  { feature: "clearness_index_kt", mean_abs_shap: 2.60, relative_importance_pct: 8.8 },
  { feature: "pv_cell_temp_c", mean_abs_shap: 1.92, relative_importance_pct: 6.5 },
  { feature: "solar_zenith_deg", mean_abs_shap: 1.55, relative_importance_pct: 5.3 },
  { feature: "solar_lag_1h", mean_abs_shap: 0.82, relative_importance_pct: 2.8 }
];

export const mockTreeShapWaterfall = {
  domain: "solar",
  hour_index: 12,
  base_value_kw: 28.5,
  final_prediction_kw: 91.8,
  features: [
    { feature: "direct_normal_irradiance", feature_value: 785.0, shap_value: 48.2, direction: "POSITIVE" },
    { feature: "diffuse_radiation", feature_value: 120.0, shap_value: 12.4, direction: "POSITIVE" },
    { feature: "clearness_index_kt", feature_value: 0.78, shap_value: 6.2, direction: "POSITIVE" },
    { feature: "pv_cell_temp_c", feature_value: 44.5, shap_value: -3.5, direction: "NEGATIVE" }
  ]
};
