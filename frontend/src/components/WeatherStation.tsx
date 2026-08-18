import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, Thermometer, SunMedium, Eye } from 'lucide-react';
import { WeatherObservation, WeatherForecastResponse } from '../types/microgrid';
import { apiClient } from '../api/client';

interface WeatherStationProps {
  weather: WeatherObservation | null;
}

export const WeatherStation: React.FC<WeatherStationProps> = ({ weather }) => {
  const [forecast, setForecast] = useState<WeatherForecastResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  useEffect(() => {
    const loadForecast = async () => {
      try {
        setLoadingForecast(true);
        const data = await apiClient.getWeatherForecast(24);
        setForecast(data);
      } catch (e) {
        console.error('Error fetching forecast:', e);
      } finally {
        setLoadingForecast(false);
      }
    };
    loadForecast();
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-5 border-b border-slate-800/80 gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-amber-400" />
            Live Meteorological Station & Irradiance Feed
          </h2>
          <p className="text-xs text-slate-400">
            Real-time public API data ground-truthed from Open-Meteo REST Service
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Source: {weather?.source || 'Open-Meteo API'}
        </span>
      </div>

      {/* Grid of Weather Sensor Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        
        {/* Solar GHI */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-1">
            <SunMedium className="h-3.5 w-3.5" />
            Global Irradiance (GHI)
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {weather ? weather.ghi.toFixed(0) : '--'} <span className="text-xs font-normal text-slate-400">W/m²</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            DNI: {weather ? weather.dni.toFixed(0) : '--'} W/m²
          </div>
        </div>

        {/* Wind Speed @ 100m */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold mb-1">
            <Wind className="h-3.5 w-3.5" />
            Hub Wind Speed (100m)
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {weather ? weather.wind_speed_100m.toFixed(1) : '--'} <span className="text-xs font-normal text-slate-400">m/s</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Surface (10m): {weather ? weather.wind_speed_10m.toFixed(1) : '--'} m/s
          </div>
        </div>

        {/* Ambient Temperature */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold mb-1">
            <Thermometer className="h-3.5 w-3.5" />
            Ambient Temperature
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {weather ? weather.temperature_c.toFixed(1) : '--'} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Humidity: {weather ? weather.relative_humidity.toFixed(0) : '--'}%
          </div>
        </div>

        {/* Cloud Cover */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
            <Eye className="h-3.5 w-3.5" />
            Cloud Cover
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {weather ? weather.cloud_cover_pct.toFixed(0) : '--'} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Pressure: {weather?.surface_pressure_hpa ? weather.surface_pressure_hpa.toFixed(0) : '1013'} hPa
          </div>
        </div>

      </div>

      {/* 24-Hour Horizon Preview Strip */}
      <div>
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>24-Hour Meteo & Generation Horizon Preview</span>
          {loadingForecast && <span className="text-[10px] text-slate-400 animate-pulse">Updating...</span>}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 overflow-x-auto pb-1">
          {forecast?.hourly.slice(0, 8).map((point, idx) => {
            const hourLabel = new Date(point.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                <div className="text-[10px] text-slate-400 font-mono mb-1">{hourLabel}</div>
                <div className="text-xs font-bold text-amber-400 font-mono">
                  {point.estimated_solar_kw} <span className="text-[9px] font-normal text-slate-400">kW</span>
                </div>
                <div className="text-xs font-bold text-cyan-400 font-mono">
                  {point.estimated_wind_kw} <span className="text-[9px] font-normal text-slate-400">kW</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
                  {point.temperature_c.toFixed(0)}°C
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
