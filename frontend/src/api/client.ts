import axios from 'axios';
import { MicrogridLiveTelemetry, WeatherObservation, WeatherForecastResponse, MicrogridHistoryPoint } from '../types/microgrid';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ModelBenchmarkData {
  timestamp: string;
  dataset_hours: number;
  train_hours: number;
  test_hours: number;
  domains: {
    [key: string]: {
      target_column: string;
      mean_actual_kw: number;
      max_actual_kw: number;
      models: {
        [model_name: string]: {
          mae: number;
          rmse: number;
          mape_pct: number;
          r2_score: number;
          skill_score_pct: number;
        };
      };
      top_feature_drivers: Array<{ feature: string; importance: number }>;
    };
  };
}

export interface MultiDomainForecast {
  forecast_generated_at: string;
  horizon_hours: number;
  active_model_name: string;
  solar: {
    domain: string;
    target_unit: string;
    capacity_kw: number;
    hourly_predictions: Array<{
      time: string;
      hour_index: number;
      predicted_p50: number;
      lower_bound_p10: number;
      upper_bound_p90: number;
      confidence_interval_width: number;
    }>;
  };
  wind: {
    domain: string;
    target_unit: string;
    capacity_kw: number;
    hourly_predictions: Array<{
      time: string;
      hour_index: number;
      predicted_p50: number;
      lower_bound_p10: number;
      upper_bound_p90: number;
      confidence_interval_width: number;
    }>;
  };
  demand: {
    domain: string;
    target_unit: string;
    capacity_kw: number;
    hourly_predictions: Array<{
      time: string;
      hour_index: number;
      predicted_p50: number;
      lower_bound_p10: number;
      upper_bound_p90: number;
      confidence_interval_width: number;
    }>;
  };
  net_load_p50: number[];
}

export interface HourlyDispatchSchedule {
  hour_index: number;
  time: string;
  tariff_inr_kwh: number;
  solar_forecast_kw: number;
  wind_forecast_kw: number;
  demand_forecast_kw: number;
  solar_to_load_kw: number;
  solar_to_batt_kw: number;
  solar_to_grid_kw: number;
  solar_curtailed_kw: number;
  wind_to_load_kw: number;
  wind_to_batt_kw: number;
  wind_to_grid_kw: number;
  wind_curtailed_kw: number;
  batt_discharge_to_load_kw: number;
  grid_import_to_load_kw: number;
  grid_import_to_batt_kw: number;
  battery_soc_pct: number;
  net_grid_exchange_kw: number;
  hourly_cost_inr: number;
  hourly_co2_kg: number;
}

export interface OptimizationResponse {
  generated_at: string;
  horizon_hours: number;
  optimization_mode: string;
  weights: {
    cost_weight: number;
    carbon_weight: number;
    battery_health_weight: number;
  };
  initial_soc_pct: number;
  schedule: HourlyDispatchSchedule[];
  kpis: {
    total_cost_inr: number;
    total_grid_import_kwh: number;
    total_grid_export_kwh: number;
    total_co2_emissions_kg: number;
    total_co2_avoided_kg: number;
    renewable_utilization_pct: number;
    battery_equivalent_full_cycles: number;
    peak_demand_kw: number;
    solver_status: string;
    solve_time_ms: number;
  };
  comparison_vs_baseline: {
    rule_based_cost_inr: number;
    milp_cost_inr: number;
    cost_savings_inr: number;
    cost_savings_pct: number;
    rule_based_co2_kg: number;
    milp_co2_kg: number;
    co2_reduction_kg: number;
    co2_reduction_pct: number;
    rule_based_grid_import_kwh: number;
    milp_grid_import_kwh: number;
    grid_import_reduction_kwh: number;
  };
}

export interface SimulationResponse {
  scenario_name: string;
  run_timestamp: string;
  horizon_hours: number;
  total_solar_kwh: number;
  total_wind_kwh: number;
  total_demand_kwh: number;
  total_unserved_energy_kwh: number;
  total_curtailed_kwh: number;
  max_grid_import_kw: number;
  min_battery_soc_pct: number;
  max_battery_soc_pct: number;
  islanding_resilience_score_pct: number;
  grid_outage_survived: boolean;
  summary_notes: string;
  timesteps: any[];
}

export interface CapacitySizingResponse {
  solar_kw: number;
  wind_kw: number;
  battery_kwh: number;
  total_capex_inr: number;
  annual_opex_inr: number;
  annual_generation_kwh: number;
  annual_savings_inr: number;
  payback_period_years: number;
  ten_year_npv_inr: number;
  twenty_year_npv_inr: number;
  lcoe_inr_per_kwh: number;
  co2_abatement_tons_per_year: number;
  renewable_fraction_pct: number;
}

export interface AnomalyDiagnosticResponse {
  scanned_at: string;
  overall_system_health_index_pct: number;
  active_anomaly_count: number;
  critical_alerts_count: number;
  equipment_health: any[];
  active_alerts: any[];
}

export interface RLBenchmarkStrategy {
  total_cost_inr: number;
  cost_savings_pct: number;
  co2_emissions_kg: number;
  renewable_utilization_pct: number;
  battery_full_cycles: number;
  inference_latency_ms: number;
  description: string;
}

export interface RLBenchmarkResponse {
  evaluation_period: string;
  strategies: {
    [key: string]: RLBenchmarkStrategy;
  };
  key_takeaways: string[];
}

export interface ChatResponse {
  response: string;
  grounded_context_used: Record<string, string>;
  suggested_followups: string[];
  timestamp: string;
}

export interface LocationPreset {
  id: string;
  name: string;
  state_country: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  description: string;
}

export const apiClient = {
  async getLocationPresets(): Promise<LocationPreset[]> {
    const res = await axios.get(`${API_BASE}/weather/locations`);
    return res.data.data;
  },

  async setPlantLocation(data: { location_name: string; latitude: number; longitude: number; altitude_m?: number }): Promise<WeatherObservation> {
    const res = await axios.post(`${API_BASE}/weather/set-location`, data);
    return res.data.data;
  },

  async getLiveTelemetry(): Promise<MicrogridLiveTelemetry> {
    const res = await axios.get(`${API_BASE}/telemetry/live`);
    return res.data.data;
  },

  async getTelemetryHistory(limit = 60): Promise<MicrogridHistoryPoint[]> {
    const res = await axios.get(`${API_BASE}/telemetry/history?limit=${limit}`);
    return res.data.data;
  },

  async getCurrentWeather(lat?: number, lon?: number, location?: string): Promise<WeatherObservation> {
    const params = new URLSearchParams();
    if (lat) params.append('latitude', lat.toString());
    if (lon) params.append('longitude', lon.toString());
    if (location) params.append('location_name', location);
    
    const res = await axios.get(`${API_BASE}/weather/current?${params.toString()}`);
    return res.data.data;
  },

  async getWeatherForecast(horizon = 24): Promise<WeatherForecastResponse> {
    const res = await axios.get(`${API_BASE}/weather/forecast?horizon_hours=${horizon}`);
    return res.data.data;
  },

  async getForecastBenchmark(): Promise<ModelBenchmarkData> {
    const res = await axios.get(`${API_BASE}/forecast/benchmark`);
    return res.data.data;
  },

  async getMultiDomainForecast(model = 'XGBoost_Quantile', horizon = 24): Promise<MultiDomainForecast> {
    const res = await axios.get(`${API_BASE}/forecast/predict?model=${model}&horizon_hours=${horizon}`);
    return res.data.data;
  },

  async getOptimalSchedule(cost = 0.5, carbon = 0.3, batteryHealth = 0.2, horizon = 24): Promise<OptimizationResponse> {
    const res = await axios.get(
      `${API_BASE}/optimizer/schedule?cost_weight=${cost}&carbon_weight=${carbon}&battery_health_weight=${batteryHealth}&horizon_hours=${horizon}`
    );
    return res.data.data;
  },

  async solveCustomOptimization(
    weights: { cost_weight: number; carbon_weight: number; battery_health_weight: number },
    initialSoc?: number,
    horizon = 24
  ): Promise<OptimizationResponse> {
    const url = initialSoc !== undefined
      ? `${API_BASE}/optimizer/solve?initial_soc_pct=${initialSoc}&horizon_hours=${horizon}`
      : `${API_BASE}/optimizer/solve?horizon_hours=${horizon}`;
    const res = await axios.post(url, weights);
    return res.data.data;
  },

  async simulateScenario(params: any): Promise<SimulationResponse> {
    const res = await axios.post(`${API_BASE}/digital-twin/simulate`, params);
    return res.data.data;
  },

  async calculateCapacitySizing(params: any): Promise<CapacitySizingResponse> {
    const res = await axios.post(`${API_BASE}/digital-twin/capacity-sizing`, params);
    return res.data.data;
  },

  async getDiagnostics(): Promise<AnomalyDiagnosticResponse> {
    const res = await axios.get(`${API_BASE}/anomalies/diagnostics`);
    return res.data.data;
  },

  async getRLBenchmark(): Promise<RLBenchmarkResponse> {
    const res = await axios.get(`${API_BASE}/rl/benchmark`);
    return res.data.data;
  },

  async runRLDispatch(): Promise<any[]> {
    const res = await axios.post(`${API_BASE}/rl/dispatch`);
    return res.data.data;
  },

  async getSHAPGlobalImportance(domain = 'solar'): Promise<any[]> {
    const res = await axios.get(`${API_BASE}/xai/global-importance?domain=${domain}`);
    return res.data.data;
  },

  async getSHAPLocalWaterfall(domain = 'solar', hour = 12): Promise<any> {
    const res = await axios.get(`${API_BASE}/xai/local-waterfall?domain=${domain}&hour_index=${hour}`);
    return res.data.data;
  },

  async sendChatMessage(message: string, history: any[] = []): Promise<ChatResponse> {
    const res = await axios.post(`${API_BASE}/assistant/chat`, {
      message,
      conversation_history: history
    });
    return res.data.data;
  },

  async checkHealth(): Promise<any> {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data.data;
  }
};
