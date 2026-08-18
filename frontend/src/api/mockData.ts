import { MicrogridLiveTelemetry, WeatherObservation, MicrogridHistoryPoint } from '../types/microgrid';
import { ModelBenchmarkData, MultiDomainForecast, OptimizationResponse, AnomalyDiagnosticResponse, RLBenchmarkResponse, SimulationResponse, ChatResponse } from './client';

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

export const mockDigitalTwinSimulation = (scenarioId = "CLOUD_COVER_STORM"): SimulationResponse => {
  const isBlackout = scenarioId === "GRID_BLACKOUT";
  const isStorm = scenarioId === "CLOUD_COVER_STORM";
  const isWindDrought = scenarioId === "WIND_DROUGHT";
  const isLoadSpike = scenarioId === "INDUSTRIAL_LOAD_SPIKE";

  const timesteps = Array.from({ length: 24 }).map((_, h) => {
    const isDay = h >= 6 && h <= 18;
    const isOutageHour = isBlackout && h >= 17 && h <= 22;
    const sFactor = isStorm ? 0.20 : 1.0;
    const wFactor = isWindDrought ? 0.20 : isStorm ? 1.45 : 1.0;
    const dFactor = isLoadSpike ? 1.85 : 1.0;

    const solar = isDay ? Math.sin(((h - 6) / 12) * Math.PI) * 95 * sFactor : 0;
    const wind = (35 + Math.sin(h * 0.4) * 15) * wFactor;
    const demand = (60 + (h >= 18 && h <= 22 ? 45 : isDay ? 30 : 10)) * dFactor;
    const gridAvail = !isOutageHour;
    const soc = Math.min(95, Math.max(20, 65 + Math.sin(h * 0.3) * 25));

    return {
      hour: h + 1,
      time: new Date(Date.now() + h * 3600000).toISOString(),
      solar_gen_kw: parseFloat(solar.toFixed(1)),
      wind_gen_kw: parseFloat(wind.toFixed(1)),
      demand_load_kw: parseFloat(demand.toFixed(1)),
      battery_power_kw: isOutageHour ? 45.0 : -15.0,
      battery_soc_pct: parseFloat(soc.toFixed(1)),
      grid_import_kw: gridAvail ? (demand > solar + wind ? parseFloat((demand - (solar + wind)).toFixed(1)) : 0) : 0,
      grid_export_kw: gridAvail && solar + wind > demand ? parseFloat(((solar + wind) - demand).toFixed(1)) : 0,
      unserved_load_kw: 0.0,
      curtailed_energy_kw: 0.0,
      grid_available: gridAvail,
      system_frequency_hz: 50.0 + (Math.random() - 0.5) * 0.1,
      stability_status: "NOMINAL_STABLE"
    };
  });

  return {
    scenario_name: scenarioId,
    run_timestamp: new Date().toISOString(),
    horizon_hours: 24,
    total_solar_kwh: 580.0,
    total_wind_kwh: 720.0,
    total_demand_kwh: 1250.0,
    total_unserved_energy_kwh: 0.0,
    total_curtailed_kwh: 0.0,
    max_grid_import_kw: isBlackout ? 0.0 : 42.0,
    min_battery_soc_pct: 22.4,
    max_battery_soc_pct: 92.0,
    islanding_resilience_score_pct: 100.0,
    grid_outage_survived: true,
    summary_notes: "Physics Digital Twin completed 24-step simulation with 100% microgrid survivability.",
    timesteps
  };
};

export const mockDiagnosticsReport: AnomalyDiagnosticResponse = {
  scanned_at: new Date().toISOString(),
  overall_system_health_index_pct: 96.9,
  active_anomaly_count: 2,
  critical_alerts_count: 0,
  equipment_health: [
    {
      equipment: "Solar PV Array (100 kW)",
      health_index_pct: 94.2,
      status: "OPTIMAL",
      key_degradation_factor: "Dust & Soiling optical loss (-4.2%)",
      mtbf_hours_estimate: 18500,
      last_serviced_date: "14 Days Ago"
    },
    {
      equipment: "Wind Turbine Nacelle (100 kW)",
      health_index_pct: 96.8,
      status: "OPTIMAL",
      key_degradation_factor: "Bearing friction vibration nominal",
      mtbf_hours_estimate: 24000,
      last_serviced_date: "28 Days Ago"
    },
    {
      equipment: "BESS Storage Pack (200 kWh)",
      health_index_pct: 98.5,
      status: "OPTIMAL",
      key_degradation_factor: "SEI layer growth minimal (0.85 EFC/day)",
      mtbf_hours_estimate: 35000,
      last_serviced_date: "7 Days Ago"
    },
    {
      equipment: "Substation Inverter Bus",
      health_index_pct: 97.1,
      status: "OPTIMAL",
      key_degradation_factor: "Capacitor thermal ripple < 2.1°C",
      mtbf_hours_estimate: 42000,
      last_serviced_date: "45 Days Ago"
    }
  ],
  active_alerts: [
    {
      id: "ALT-PV-2026-09",
      timestamp: new Date().toISOString(),
      equipment: "SOLAR_PV",
      anomaly_type: "DUST_SOILING_OPTICAL_LOSS",
      severity: "WARNING",
      confidence_score: 0.94,
      detected_value: 0.88,
      expected_nominal_range: "0.95 - 1.00",
      root_cause_analysis: "Optical transmittance degradation on String 3 due to particulate accumulation.",
      recommended_maintenance_action: "Trigger autonomous dry wiper cleaning robot cycle.",
      estimated_annual_loss_inr: 14200,
      detection_timestamp: "12 mins ago"
    },
    {
      id: "ALT-WD-2026-04",
      timestamp: new Date().toISOString(),
      equipment: "WIND_TURBINE",
      anomaly_type: "YAW_MISALIGNMENT_DRIFT",
      severity: "WARNING",
      confidence_score: 0.91,
      detected_value: 4.8,
      expected_nominal_range: "0.0° - 2.5°",
      root_cause_analysis: "3.2° yaw heading misalignment against dominant southwest monsoon wind vector.",
      recommended_maintenance_action: "Recalibrate ultrasonic anemometer zero-point offset.",
      estimated_annual_loss_inr: 8500,
      detection_timestamp: "45 mins ago"
    }
  ]
};

export const mockRLBenchmark: RLBenchmarkResponse = {
  evaluation_period: "24-Hour Horizon (100 kW Solar + 100 kW Wind + 200 kWh BESS)",
  strategies: {
    Rule_Based_Heuristic: {
      total_cost_inr: 1480.50,
      cost_savings_pct: 0.0,
      co2_emissions_kg: 172.5,
      renewable_utilization_pct: 78.4,
      battery_full_cycles: 1.42,
      inference_latency_ms: 0.02,
      description: "Greedy heuristic charging on surplus, discharging on deficit."
    },
    PPO_Reinforcement_Learning: {
      total_cost_inr: 1228.40,
      cost_savings_pct: 17.03,
      co2_emissions_kg: 144.2,
      renewable_utilization_pct: 91.8,
      battery_full_cycles: 0.92,
      inference_latency_ms: 0.35,
      description: "Continuous Actor-Critic PPO policy for sub-second real-time grid stabilization."
    },
    MILP_Deterministic_Optimal: {
      total_cost_inr: 1184.20,
      cost_savings_pct: 20.02,
      co2_emissions_kg: 138.0,
      renewable_utilization_pct: 94.2,
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

export const mockRLTrajectory = Array.from({ length: 24 }).map((_, step) => {
  const isDay = step >= 6 && step <= 18;
  const isPeak = step >= 18 && step <= 22;
  const s = isDay ? Math.sin(((step - 6) / 12) * Math.PI) * 88 : 0;
  const w = 35 + Math.sin(step * 0.4) * 14;
  const d = 60 + (isPeak ? 45 : isDay ? 30 : 10);
  const action = isPeak ? 35.0 : isDay ? -28.0 : 0.0;
  const soc = isPeak ? 85 - (step - 18) * 12 : isDay ? 40 + (step - 6) * 4 : 45;
  const gridIn = isPeak ? Math.max(0, d - (w + action)) : 0;

  return {
    hour: step + 1,
    action_setpoint_kw: action,
    battery_soc_pct: parseFloat(Math.min(95, Math.max(15, soc)).toFixed(1)),
    solar_kw: parseFloat(s.toFixed(1)),
    wind_kw: parseFloat(w.toFixed(1)),
    demand_kw: parseFloat(d.toFixed(1)),
    grid_import_kw: parseFloat(gridIn.toFixed(1)),
    hourly_cost_inr: parseFloat(((gridIn * (isPeak ? 11.0 : 7.50))).toFixed(1))
  };
});

export const mockTreeShapGlobal = (domain = "solar") => {
  if (domain === "solar") {
    return [
      { feature: "direct_normal_irradiance_wm2", importance_score: 0.624, importance_pct: 62.4, description: "Direct Normal Irradiance (Beam component)" },
      { feature: "diffuse_horizontal_irradiance_wm2", importance_score: 0.142, importance_pct: 14.2, description: "Diffuse Sky Radiation" },
      { feature: "clearness_index", importance_score: 0.088, importance_pct: 8.8, description: "Atmospheric Clearness Index (Kt)" },
      { feature: "pv_cell_temperature_c", importance_score: 0.052, importance_pct: 5.2, description: "PV Cell Temperature derating" },
      { feature: "solar_zenith_deg", importance_score: 0.045, importance_pct: 4.5, description: "Solar Zenith Angle (Elevation)" },
      { feature: "solar_lag_1h", importance_score: 0.022, importance_pct: 2.2, description: "1-Hour Prior Generation Auto-Regressive Lag" }
    ];
  } else if (domain === "wind") {
    return [
      { feature: "wind_speed_100m_ms", importance_score: 0.585, importance_pct: 58.5, description: "100m Hub Height Wind Speed" },
      { feature: "wind_power_proxy_v3", importance_score: 0.224, importance_pct: 22.4, description: "Kinetic Energy Cube Proxy (v³)" },
      { feature: "air_density_kg_m3", importance_score: 0.078, importance_pct: 7.8, description: "Atmospheric Air Density ρ(T,P)" },
      { feature: "wind_dir_sin", importance_score: 0.042, importance_pct: 4.2, description: "Wind Direction Compass Sine" },
      { feature: "wind_lag_1h", importance_score: 0.031, importance_pct: 3.1, description: "1-Hour Prior Wind Lag" }
    ];
  } else {
    return [
      { feature: "demand_lag_24h", importance_score: 0.412, importance_pct: 41.2, description: "24-Hour Prior Daily Load Lag" },
      { feature: "cooling_degree_days", importance_score: 0.235, importance_pct: 23.5, description: "Cooling Degree Days (HVAC Chiller Load)" },
      { feature: "demand_lag_168h", importance_score: 0.145, importance_pct: 14.5, description: "168-Hour Prior Weekly Day-Match Lag" },
      { feature: "temperature_c", importance_score: 0.082, importance_pct: 8.2, description: "Ambient Temperature (°C)" },
      { feature: "is_weekend", importance_score: 0.048, importance_pct: 4.8, description: "Weekend Binary Indicator" }
    ];
  }
};

export const mockTreeShapWaterfall = (domain = "solar", hourIndex = 12) => {
  if (domain === "solar") {
    const isMidday = hourIndex >= 10 && hourIndex <= 15;
    return {
      domain,
      hour_index: hourIndex,
      base_value_kw: 24.5,
      predicted_p50_kw: isMidday ? 88.4 : 18.2,
      net_shap_delta: isMidday ? 63.9 : -6.3,
      drivers: isMidday ? [
        { feature: "direct_normal_irradiance_wm2", feature_value: "840 W/m²", shap_value: 42.8, direction: "POSITIVE" },
        { feature: "solar_zenith_deg", feature_value: "24.2°", shap_value: 14.2, direction: "POSITIVE" },
        { feature: "clearness_index", feature_value: "0.78", shap_value: 9.1, direction: "POSITIVE" },
        { feature: "pv_cell_temperature_c", feature_value: "48.5°C", shap_value: -2.2, direction: "NEGATIVE" }
      ] : [
        { feature: "solar_zenith_deg", feature_value: "82.0°", shap_value: -16.5, direction: "NEGATIVE" },
        { feature: "direct_normal_irradiance_wm2", feature_value: "120 W/m²", shap_value: -8.0, direction: "NEGATIVE" }
      ]
    };
  } else if (domain === "wind") {
    return {
      domain,
      hour_index: hourIndex,
      base_value_kw: 38.0,
      predicted_p50_kw: 54.2,
      net_shap_delta: 16.2,
      drivers: [
        { feature: "wind_speed_100m_ms", feature_value: "10.8 m/s", shap_value: 12.4, direction: "POSITIVE" },
        { feature: "wind_power_proxy_v3", feature_value: "1260 m³/s³", shap_value: 4.8, direction: "POSITIVE" },
        { feature: "air_density_kg_m3", feature_value: "1.21 kg/m³", shap_value: -1.0, direction: "NEGATIVE" }
      ]
    };
  } else {
    return {
      domain,
      hour_index: hourIndex,
      base_value_kw: 55.0,
      predicted_p50_kw: 78.5,
      net_shap_delta: 23.5,
      drivers: [
        { feature: "demand_lag_24h", feature_value: "76.2 kW", shap_value: 14.6, direction: "POSITIVE" },
        { feature: "cooling_degree_days", feature_value: "14.2 CDD", shap_value: 6.4, direction: "POSITIVE" },
        { feature: "hour_sin", feature_value: `Hour ${hourIndex}`, shap_value: 2.5, direction: "POSITIVE" }
      ]
    };
  }
};

export const generateCoPilotResponse = (prompt: string): ChatResponse => {
  const p = prompt.toLowerCase();
  let response = "";
  const context: Record<string, string> = {
    "Plant ID": "Hadapsar Clean Energy Hub, Pune (100 kW PV + 100 kW Wind + 200 kWh BESS)",
    "Operating State": "Grid-Connected Balanced Microgrid",
    "Current Tariff": "₹7.50 / kWh (Off-Peak ₹6.40, Peak ₹11.00)",
    "Battery Status": "SOC 68.4% • Charging at 22.5 kW"
  };

  if (p.includes("battery") || p.includes("charge") || p.includes("soc")) {
    response = `🔋 **Battery Dispatch Decision Reasoning:**\n\nThe 200 kWh BESS is currently charging at **22.5 kW** (SOC: 68.4%).\n\n• **Physical Logic**: Total clean generation (Solar: 68.5 kW + Wind: 42.1 kW = 110.6 kW) exceeds campus demand (85.0 kW) by 25.6 kW.\n• **Economic Optimization**: Google OR-Tools MILP is storing this surplus clean energy now so it can be discharged during the evening peak tariff window (18:00–22:00 @ ₹11.00/kWh), avoiding costly grid purchases.`;
    context["Optimizer Strategy"] = "Surplus Renewable Storage for Peak Tariff Arbitrage";
  } else if (p.includes("money") || p.includes("save") || p.includes("milp") || p.includes("cost") || p.includes("saving")) {
    response = `💰 **Financial Savings & Optimization Performance:**\n\n• **Unoptimized Baseline Cost**: ₹1,480.50 / day\n• **AI-REMS MILP Optimal Cost**: ₹1,184.20 / day\n• **Net Daily Savings**: **₹296.30 (20.02% reduction)**\n• **Annual Projected Cost Avoidance**: ₹1,08,150 per microgrid node.\n\nSavings are achieved by scheduling zero-emission solar and wind to displace peak diesel/grid power and restricting battery cycling to 0.85 EFC/day to preserve pack longevity.`;
    context["MILP Solver Status"] = "OPTIMAL (Solve time: 4.2 ms)";
  } else if (p.includes("anomaly") || p.includes("alert") || p.includes("maintenance") || p.includes("health")) {
    response = `🛡️ **Isolation Forest Anomaly & Predictive Health Summary:**\n\nOverall System Health Index is **96.9% (Nominal)**.\n\n• **Active Alert 1**: String 3 Solar PV optical soiling detected (Transmittance 0.88 vs 1.0 nominal). Recommendation: Trigger robotic dry wiper cycle.\n• **Active Alert 2**: Wind Turbine nacelle 3.2° yaw drift against southwest wind vector. Recommendation: Recalibrate ultrasonic anemometer zero-point offset.\n• **Trip Risk**: Zero trip conditions detected across all 4 electrical buses.`;
    context["Health Status"] = "96.9% Optimal • 2 Active Prescriptive Alerts";
  } else if (p.includes("shap") || p.includes("solar") || p.includes("driver") || p.includes("feature")) {
    response = `📊 **TreeSHAP Game-Theoretic Explainability Breakdown:**\n\nFor Solar PV Generation (100 kW array):\n\n1. **Direct Normal Irradiance (DNI)**: +62.4% relative gain contribution (+42.8 kW at midday).\n2. **Diffuse Sky Radiation**: +14.2% contribution under cloud scatter.\n3. **Atmospheric Clearness Index (Kt)**: +8.8% contribution.\n4. **PV Cell Temperature Derating**: -5.2% negative derating penalty when module temperature exceeds 45°C.`;
    context["SHAP Explainer"] = "TreeExplainer (XGBoost Quantile P50 Baseline E[f(x)] = 24.5 kW)";
  } else if (p.includes("rl") || p.includes("ppo") || p.includes("gym")) {
    response = `🤖 **PPO Reinforcement Learning vs MILP Comparative Analysis:**\n\n• **Inference Latency**: PPO agent executes in **0.35 ms** (12x faster than MILP @ 4.20 ms), enabling sub-second inverter PWM setpoint tracking.\n• **Economic Capture**: PPO achieves **₹1,228.40 / day** (17.03% savings), capturing **85%** of theoretical global MILP optimum without requiring perfect 24h weather lookahead.\n• **Self-Consumption**: 91.8% renewable utilization with zero load shedding.`;
    context["RL Architecture"] = "Continuous Actor-Critic (Clip ε=0.2, γ=0.99)";
  } else {
    response = `⚡ **AI-REMS Grounded Operations Report:**\n\nMicrogrid node is operating at **100% renewable self-sufficiency** (Solar: 68.5 kW, Wind: 42.1 kW, Demand: 85.0 kW). The BESS battery is at **68.4% SOC**, zero power is imported from the utility grid, and 3.1 kW clean surplus is being exported. Overall system health index is **96.9%**.`;
  }

  return {
    response,
    grounded_context_used: context,
    suggested_followups: [
      "Why is the battery charging right now?",
      "How much money did the MILP optimizer save today?",
      "Explain active anomaly alerts and maintenance actions.",
      "What are the primary TreeSHAP drivers for solar generation?"
    ],
    timestamp: new Date().toISOString()
  };
};
