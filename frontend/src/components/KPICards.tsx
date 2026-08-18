import React from 'react';
import { Sun, Wind, BatteryCharging, Factory, UtilityPole, Leaf } from 'lucide-react';
import { MicrogridLiveTelemetry } from '../types/microgrid';

interface KPICardsProps {
  telemetry: MicrogridLiveTelemetry | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const isBattDischarging = telemetry.battery_power_kw > 0.1;
  const isBattCharging = telemetry.battery_power_kw < -0.1;
  const isGridImporting = telemetry.grid_import_kw > 0.1;
  const isGridExporting = telemetry.grid_export_kw > 0.1;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      
      {/* 1. Solar Generation */}
      <div className="glass-card rounded-xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-amber-400" />
            Solar PV
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
            {Math.round(telemetry.weather_summary.ghi)} W/m²
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {telemetry.solar_generation_kw.toFixed(1)}
          </span>
          <span className="text-xs font-medium text-slate-400">kW</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Cap: 100 kW</span>
          <span className="text-amber-400 font-medium">
            {((telemetry.solar_generation_kw / 100.0) * 100).toFixed(0)}% Load
          </span>
        </div>
      </div>

      {/* 2. Wind Generation */}
      <div className="glass-card rounded-xl p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-cyan-400" />
            Wind Turbine
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
            {telemetry.weather_summary.wind_speed_100m.toFixed(1)} m/s
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {telemetry.wind_generation_kw.toFixed(1)}
          </span>
          <span className="text-xs font-medium text-slate-400">kW</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Cap: 100 kW</span>
          <span className="text-cyan-400 font-medium">
            {((telemetry.wind_generation_kw / 100.0) * 100).toFixed(0)}% Load
          </span>
        </div>
      </div>

      {/* 3. Demand / Load */}
      <div className="glass-card rounded-xl p-4 border border-pink-500/20 hover:border-pink-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-400/90 flex items-center gap-1.5">
            <Factory className="h-4 w-4 text-pink-400" />
            Campus Load
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300">
            Active
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {telemetry.demand_load_kw.toFixed(1)}
          </span>
          <span className="text-xs font-medium text-slate-400">kW</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Net Load:</span>
          <span className={`font-mono font-medium ${telemetry.net_load_kw > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {telemetry.net_load_kw > 0 ? `+${telemetry.net_load_kw.toFixed(1)}` : telemetry.net_load_kw.toFixed(1)} kW
          </span>
        </div>
      </div>

      {/* 4. Battery Storage (BESS) */}
      <div className="glass-card rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
            <BatteryCharging className="h-4 w-4 text-emerald-400" />
            BESS SOC
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
            isBattCharging ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' :
            isBattDischarging ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {telemetry.battery_status}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {telemetry.battery_soc_pct.toFixed(1)}%
          </span>
          <span className="text-xs font-medium text-slate-400">
            ({Math.abs(telemetry.battery_power_kw).toFixed(1)} kW)
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Cap: 200 kWh</span>
          <span className="text-emerald-400 font-mono">
            {telemetry.battery_temperature_c}°C
          </span>
        </div>
      </div>

      {/* 5. Grid Interconnection */}
      <div className="glass-card rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400/90 flex items-center gap-1.5">
            <UtilityPole className="h-4 w-4 text-purple-400" />
            Grid Exchange
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">
            ₹{telemetry.grid_tariff_inr.toFixed(2)}/u
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {isGridImporting ? telemetry.grid_import_kw.toFixed(1) : telemetry.grid_export_kw.toFixed(1)}
          </span>
          <span className="text-xs font-medium text-slate-400">kW</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Status:</span>
          <span className={`font-semibold ${isGridImporting ? 'text-amber-400' : isGridExporting ? 'text-emerald-400' : 'text-slate-400'}`}>
            {telemetry.grid_status}
          </span>
        </div>
      </div>

      {/* 6. Renewable Fraction & CO2 */}
      <div className="glass-card rounded-xl p-4 border border-teal-500/20 hover:border-teal-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400/90 flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-teal-400" />
            Renewable Mix
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300">
            Clean Energy
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {telemetry.renewable_fraction_pct.toFixed(0)}%
          </span>
          <span className="text-xs font-medium text-slate-400">of load</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>CO₂ Avoided:</span>
          <span className="text-emerald-400 font-mono font-medium">
            {telemetry.carbon_avoided_kg_per_hr.toFixed(1)} kg/h
          </span>
        </div>
      </div>

    </div>
  );
};
