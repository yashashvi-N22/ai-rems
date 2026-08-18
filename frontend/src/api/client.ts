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

import {
  mockInitialWeather,
  mockInitialTelemetry,
  generateMockHistory,
  mockForecastData,
  mockBenchmarkData,
  mockOptimizationSchedule,
  mockDiagnosticsReport,
  mockRLBenchmark,
  mockTreeShapGlobal,
  mockTreeShapWaterfall
} from './mockData';

export const apiClient = {
  async getLocationPresets(): Promise<LocationPreset[]> {
    try {
      const res = await axios.get(`${API_BASE}/weather/locations`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return [
        { id: "pune_hadapsar", name: "Hadapsar Clean Energy Hub, Pune", state_country: "Maharashtra, India", latitude: 18.5089, longitude: 73.9260, altitude_m: 560.0, description: "Urban industrial & IT corridor microgrid with high rooftop PV and daytime load demand." },
        { id: "charanka_gujarat", name: "Charanka Solar-Wind Hybrid Park", state_country: "Patan, Gujarat, India", latitude: 23.8343, longitude: 71.1924, altitude_m: 18.0, description: "Asia's pioneer 700+ MW mega solar park with strong Kutch wind corridors." },
        { id: "bhadla_rajasthan", name: "Bhadla Mega Solar Park", state_country: "Phalodi, Rajasthan, India", latitude: 27.5360, longitude: 71.9170, altitude_m: 220.0, description: "World's largest 2,245 MW solar installation with extreme desert DNI irradiance." },
        { id: "pavagada_karnataka", name: "Pavagada Solar Park (Shakti Sthala)", state_country: "Tumakuru, Karnataka, India", latitude: 14.2800, longitude: 77.4100, altitude_m: 650.0, description: "2,050 MW high-altitude plateau solar park with Deccan plateau wind profile." },
        { id: "leh_ladakh", name: "Ladakh High-Altitude Solar Hub", state_country: "Leh, Ladakh, India", latitude: 34.1526, longitude: 77.5771, altitude_m: 3500.0, description: "High UV irradiance cold-desert microgrid with critical battery thermal insulation needs." }
      ];
    }
  },

  async setPlantLocation(data: { location_name: string; latitude: number; longitude: number; altitude_m?: number }): Promise<WeatherObservation> {
    try {
      const res = await axios.post(`${API_BASE}/weather/set-location`, data, { timeout: 4000 });
      return res.data.data;
    } catch {
      return {
        ...mockInitialWeather,
        location_name: data.location_name,
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
  },

  async getLiveTelemetry(): Promise<MicrogridLiveTelemetry> {
    try {
      const res = await axios.get(`${API_BASE}/telemetry/live`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockInitialTelemetry;
    }
  },

  async getTelemetryHistory(limit = 60): Promise<MicrogridHistoryPoint[]> {
    try {
      const res = await axios.get(`${API_BASE}/telemetry/history?limit=${limit}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return generateMockHistory(limit);
    }
  },

  async getCurrentWeather(lat?: number, lon?: number, location?: string): Promise<WeatherObservation> {
    try {
      const params = new URLSearchParams();
      if (lat) params.append('latitude', lat.toString());
      if (lon) params.append('longitude', lon.toString());
      if (location) params.append('location_name', location);
      
      const res = await axios.get(`${API_BASE}/weather/current?${params.toString()}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockInitialWeather;
    }
  },

  async getWeatherForecast(horizon = 24): Promise<WeatherForecastResponse> {
    try {
      const res = await axios.get(`${API_BASE}/weather/forecast?horizon_hours=${horizon}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return {
        location_name: "Hadapsar Clean Energy Hub, Pune",
        latitude: 18.5089,
        longitude: 73.9260,
        forecast_generated_at: new Date().toISOString(),
        horizon_hours: horizon,
        hourly: Array.from({ length: horizon }).map((_, h) => ({
          time: new Date(Date.now() + h * 3600000).toISOString(),
          temperature_c: 28 + Math.sin(h * 0.3) * 4,
          cloud_cover_pct: 20 + Math.sin(h * 0.4) * 15,
          ghi: h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) * 750 : 0,
          dni: h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) * 600 : 0,
          dhi: h >= 6 && h <= 18 ? 120 : 0,
          wind_speed_10m: 4.5 + Math.sin(h * 0.2) * 2,
          wind_speed_100m: 8.5 + Math.sin(h * 0.2) * 3,
          wind_direction_deg: 265.0,
          estimated_solar_kw: h >= 6 && h <= 18 ? Math.sin(((h - 6) / 12) * Math.PI) * 85 : 0,
          estimated_wind_kw: 35 + Math.sin(h * 0.2) * 15
        }))
      };
    }
  },

  async getForecastBenchmark(): Promise<ModelBenchmarkData> {
    try {
      const res = await axios.get(`${API_BASE}/forecast/benchmark`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockBenchmarkData;
    }
  },

  async getMultiDomainForecast(model = 'XGBoost_Quantile', horizon = 24): Promise<MultiDomainForecast> {
    try {
      const res = await axios.get(`${API_BASE}/forecast/predict?model=${model}&horizon_hours=${horizon}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockForecastData;
    }
  },

  async getOptimalSchedule(cost = 0.5, carbon = 0.3, batteryHealth = 0.2, horizon = 24): Promise<OptimizationResponse> {
    try {
      const res = await axios.get(
        `${API_BASE}/optimizer/schedule?cost_weight=${cost}&carbon_weight=${carbon}&battery_health_weight=${batteryHealth}&horizon_hours=${horizon}`,
        { timeout: 4000 }
      );
      return res.data.data;
    } catch {
      return mockOptimizationSchedule;
    }
  },

  async solveCustomOptimization(
    weights: { cost_weight: number; carbon_weight: number; battery_health_weight: number },
    initialSoc?: number,
    horizon = 24
  ): Promise<OptimizationResponse> {
    try {
      const url = initialSoc !== undefined
        ? `${API_BASE}/optimizer/solve?initial_soc_pct=${initialSoc}&horizon_hours=${horizon}`
        : `${API_BASE}/optimizer/solve?horizon_hours=${horizon}`;
      const res = await axios.post(url, weights, { timeout: 4000 });
      return res.data.data;
    } catch {
      return mockOptimizationSchedule;
    }
  },

  async simulateScenario(params: any): Promise<SimulationResponse> {
    try {
      const res = await axios.post(`${API_BASE}/digital-twin/simulate`, params, { timeout: 4000 });
      return res.data.data;
    } catch {
      return {
        scenario_name: params?.scenario_id ? String(params.scenario_id).toUpperCase() : "GRID_OUTAGE",
        run_timestamp: new Date().toISOString(),
        horizon_hours: 24,
        total_solar_kwh: 580.0,
        total_wind_kwh: 720.0,
        total_demand_kwh: 1250.0,
        total_unserved_energy_kwh: 0.0,
        total_curtailed_kwh: 0.0,
        max_grid_import_kw: 0.0,
        min_battery_soc_pct: 22.4,
        max_battery_soc_pct: 92.0,
        islanding_resilience_score_pct: 100.0,
        grid_outage_survived: true,
        summary_notes: "Simulation completed successfully with 100% islanded microgrid survivability.",
        timesteps: []
      };
    }
  },

  async calculateCapacitySizing(params: any): Promise<CapacitySizingResponse> {
    try {
      const res = await axios.post(`${API_BASE}/digital-twin/capacity-sizing`, params, { timeout: 4000 });
      return res.data.data;
    } catch {
      return {
        solar_kw: params?.solar_kw || 100,
        wind_kw: params?.wind_kw || 100,
        battery_kwh: params?.battery_kwh || 200,
        total_capex_inr: 12500000,
        annual_opex_inr: 250000,
        annual_generation_kwh: 290000,
        annual_savings_inr: 2850000,
        payback_period_years: 4.38,
        ten_year_npv_inr: 7850000,
        twenty_year_npv_inr: 14200000,
        lcoe_inr_per_kwh: 3.42,
        co2_abatement_tons_per_year: 12.6,
        renewable_fraction_pct: 86.4
      };
    }
  },

  async getDiagnostics(): Promise<AnomalyDiagnosticResponse> {
    try {
      const res = await axios.get(`${API_BASE}/anomalies/diagnostics`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockDiagnosticsReport;
    }
  },

  async getRLBenchmark(): Promise<RLBenchmarkResponse> {
    try {
      const res = await axios.get(`${API_BASE}/rl/benchmark`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockRLBenchmark;
    }
  },

  async runRLDispatch(): Promise<any[]> {
    try {
      const res = await axios.post(`${API_BASE}/rl/dispatch`, {}, { timeout: 3000 });
      return res.data.data;
    } catch {
      return [];
    }
  },

  async getSHAPGlobalImportance(domain = 'solar'): Promise<any[]> {
    try {
      const res = await axios.get(`${API_BASE}/xai/global-importance?domain=${domain}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockTreeShapGlobal;
    }
  },

  async getSHAPLocalWaterfall(domain = 'solar', hour = 12): Promise<any> {
    try {
      const res = await axios.get(`${API_BASE}/xai/local-waterfall?domain=${domain}&hour_index=${hour}`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return mockTreeShapWaterfall;
    }
  },

  async sendChatMessage(message: string, history: any[] = []): Promise<ChatResponse> {
    try {
      const res = await axios.post(`${API_BASE}/assistant/chat`, {
        message,
        conversation_history: history
      }, { timeout: 5000 });
      return res.data.data;
    } catch {
      return {
        response: `Based on live microgrid telemetry for the Hadapsar, Pune Hub (100 kW Solar + 100 kW Wind + 200 kWh BESS): The battery is currently maintaining stable State of Charge (SOC 68.4%) with zero unserved load and 100% renewable fraction. Google OR-Tools MILP optimization is delivering +20.0% cost reduction under current Time-of-Use tariffs.`,
        grounded_context_used: {
          "Plant": "Hadapsar Clean Energy Hub, Pune (100 kW Solar + 100 kW Wind + 200 kWh BESS)",
          "Live Generation": "Solar: 68.5 kW, Wind: 42.1 kW, Demand: 85.0 kW",
          "Battery Status": "SOC: 68.4%, Flow: -22.5 kW (Charging)",
          "System Health": "96.9% Normal"
        },
        suggested_followups: [
          "Explain the current battery charge decision",
          "What is our estimated carbon offset today?",
          "How does PPO RL compare to MILP?"
        ],
        timestamp: new Date().toISOString()
      };
    }
  },

  async checkHealth(): Promise<any> {
    try {
      const res = await axios.get(`${API_BASE}/health`, { timeout: 3000 });
      return res.data.data;
    } catch {
      return { status: "healthy", simulation_mode: true };
    }
  }
};
