export interface WeatherObservation {
  timestamp: string;
  location_name: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  relative_humidity: number;
  surface_pressure_hpa?: number;
  cloud_cover_pct: number;
  precipitation_mm: number;
  ghi: number;
  dni: number;
  dhi: number;
  wind_speed_10m: number;
  wind_speed_100m: number;
  wind_direction_deg: number;
  wind_gusts_10m?: number;
  source: string;
}

export interface HourlyForecastPoint {
  time: string;
  temperature_c: number;
  cloud_cover_pct: number;
  ghi: number;
  dni: number;
  dhi: number;
  wind_speed_10m: number;
  wind_speed_100m: number;
  wind_direction_deg: number;
  estimated_solar_kw: number;
  estimated_wind_kw: number;
}

export interface WeatherForecastResponse {
  location_name: string;
  latitude: number;
  longitude: number;
  forecast_generated_at: string;
  horizon_hours: number;
  hourly: HourlyForecastPoint[];
}

export interface PowerFlowBreakdown {
  solar_to_load_kw: number;
  solar_to_batt_kw: number;
  solar_to_grid_kw: number;
  solar_curtailed_kw: number;
  wind_to_load_kw: number;
  wind_to_batt_kw: number;
  wind_to_grid_kw: number;
  wind_curtailed_kw: number;
  batt_to_load_kw: number;
  grid_to_load_kw: number;
  grid_to_batt_kw: number;
}

export interface MicrogridLiveTelemetry {
  timestamp: string;
  system_id: string;
  solar_generation_kw: number;
  wind_generation_kw: number;
  total_renewable_generation_kw: number;
  demand_load_kw: number;
  net_load_kw: number;
  battery_soc_pct: number;
  battery_power_kw: number;
  battery_status: 'CHARGING' | 'DISCHARGING' | 'IDLE';
  battery_temperature_c: number;
  battery_soh_pct: number;
  grid_import_kw: number;
  grid_export_kw: number;
  grid_status: 'IMPORTING' | 'EXPORTING' | 'ZERO_EXCHANGE';
  grid_tariff_inr: number;
  renewable_fraction_pct: number;
  carbon_avoided_kg_per_hr: number;
  current_cost_rate_inr_per_hr: number;
  flow: PowerFlowBreakdown;
  weather_summary: {
    ghi: number;
    dni: number;
    wind_speed_100m: number;
    temperature_c: number;
    cloud_cover_pct: number;
    source: string;
  };
  is_simulated: boolean;
}

export interface MicrogridHistoryPoint {
  timestamp: string;
  solar_kw: number;
  wind_kw: number;
  demand_kw: number;
  battery_soc_pct: number;
  battery_power_kw: number;
  grid_import_kw: number;
  grid_export_kw: number;
  renewable_fraction_pct: number;
}
