import React from 'react';
import { Sun, Wind, Battery, Factory, UtilityPole, Zap } from 'lucide-react';
import { MicrogridLiveTelemetry } from '../types/microgrid';

interface LiveEnergyFlowProps {
  telemetry: MicrogridLiveTelemetry | null;
}

export const LiveEnergyFlow: React.FC<LiveEnergyFlowProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const { flow, solar_generation_kw, wind_generation_kw, demand_load_kw, battery_power_kw, grid_import_kw, grid_export_kw } = telemetry;
  const isCharging = battery_power_kw < -0.1;
  const isDischarging = battery_power_kw > 0.1;
  const isImporting = grid_import_kw > 0.1;
  const isExporting = grid_export_kw > 0.1;

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-slate-800/80 gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" />
            Live Power Flow Network & Dispatch Vector
          </h2>
          <p className="text-xs text-slate-400">
            Real-time physical power distribution across generation, storage, load, and grid exchange
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Balance: {((flow.solar_to_load_kw + flow.wind_to_load_kw + flow.batt_to_load_kw + flow.grid_to_load_kw) - demand_load_kw).toFixed(2)} kW
          </span>
        </div>
      </div>

      {/* Flow Grid Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        {/* Left Column: GENERATION SOURCES */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Generation Assets (200 kW Cap)
          </div>

          {/* Solar Asset Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Solar PV Field</div>
                  <div className="text-[11px] text-amber-400/80 font-mono">{telemetry.weather_summary.ghi.toFixed(0)} W/m² GHI</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-amber-400">{solar_generation_kw.toFixed(1)} kW</div>
                <div className="text-[10px] text-slate-400">Capacity: 100 kW</div>
              </div>
            </div>
            
            {/* Direct flow channels */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">↳ Direct to Load:</span>
                <span className="text-white font-medium">{flow.solar_to_load_kw.toFixed(1)} kW</span>
              </div>
              {flow.solar_to_batt_kw > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>↳ To Battery Charge:</span>
                  <span>{flow.solar_to_batt_kw.toFixed(1)} kW</span>
                </div>
              )}
              {flow.solar_to_grid_kw > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>↳ Export to Grid:</span>
                  <span>{flow.solar_to_grid_kw.toFixed(1)} kW</span>
                </div>
              )}
            </div>
          </div>

          {/* Wind Asset Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Wind className="h-5 w-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Wind Turbine Hub</div>
                  <div className="text-[11px] text-cyan-400/80 font-mono">{telemetry.weather_summary.wind_speed_100m.toFixed(1)} m/s @ 100m</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-cyan-400">{wind_generation_kw.toFixed(1)} kW</div>
                <div className="text-[10px] text-slate-400">Capacity: 100 kW</div>
              </div>
            </div>

            {/* Direct flow channels */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">↳ Direct to Load:</span>
                <span className="text-white font-medium">{flow.wind_to_load_kw.toFixed(1)} kW</span>
              </div>
              {flow.wind_to_batt_kw > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>↳ To Battery Charge:</span>
                  <span>{flow.wind_to_batt_kw.toFixed(1)} kW</span>
                </div>
              )}
              {flow.wind_to_grid_kw > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>↳ Export to Grid:</span>
                  <span>{flow.wind_to_grid_kw.toFixed(1)} kW</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Middle Column: CENTRAL MICROGRID BUS & BESS */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center px-1">
            Dispatch Nexus & Energy Storage
          </div>

          {/* Central Bus Junction */}
          <div className="p-4 rounded-xl bg-slate-900 border-2 border-emerald-500/40 text-center relative shadow-xl shadow-emerald-500/10">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
              <Zap className="h-4 w-4" />
              Microgrid AC Bus (415V / 50Hz)
            </div>
            <div className="text-2xl font-mono font-bold text-white my-1">
              {(solar_generation_kw + wind_generation_kw).toFixed(1)} kW
            </div>
            <div className="text-[11px] text-slate-400">
              Total Green Generation Input
            </div>
          </div>

          {/* Battery BESS Hub */}
          <div className={`p-4 rounded-xl bg-slate-900/90 border transition-all ${
            isCharging ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' :
            isDischarging ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isCharging ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Battery className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">BESS Storage Pack</div>
                  <div className="text-[11px] text-slate-400 font-mono">200 kWh LiFePO4</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-mono font-bold ${isCharging ? 'text-emerald-400' : isDischarging ? 'text-blue-400' : 'text-slate-300'}`}>
                  {telemetry.battery_soc_pct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400">{telemetry.battery_status}</div>
              </div>
            </div>

            {/* SOC Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden my-2 border border-slate-700">
              <div
                className={`h-full transition-all duration-500 ${
                  telemetry.battery_soc_pct > 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                  telemetry.battery_soc_pct > 25 ? 'bg-gradient-to-r from-amber-500 to-emerald-500' :
                  'bg-gradient-to-r from-red-500 to-amber-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, telemetry.battery_soc_pct))}%` }}
              />
            </div>

            <div className="text-[11px] font-mono text-slate-300 flex justify-between pt-1">
              <span>Power: {Math.abs(battery_power_kw).toFixed(1)} kW</span>
              <span>Health: {telemetry.battery_soh_pct.toFixed(1)}%</span>
            </div>
          </div>

        </div>

        {/* Right Column: LOAD & UTILITY GRID */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Consumer Load & Grid Exchange
          </div>

          {/* Campus Load Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-pink-500/30 shadow-lg shadow-pink-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Campus / Industrial Load</div>
                  <div className="text-[11px] text-pink-400/80 font-mono">Dynamic Demand Profile</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-pink-400">{demand_load_kw.toFixed(1)} kW</div>
                <div className="text-[10px] text-slate-400">Active Demand</div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">↳ Solar Fed:</span>
                <span className="text-amber-400">{flow.solar_to_load_kw.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">↳ Wind Fed:</span>
                <span className="text-cyan-400">{flow.wind_to_load_kw.toFixed(1)} kW</span>
              </div>
              {flow.batt_to_load_kw > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">↳ BESS Discharge:</span>
                  <span className="text-blue-400">{flow.batt_to_load_kw.toFixed(1)} kW</span>
                </div>
              )}
              {flow.grid_to_load_kw > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">↳ Grid Import:</span>
                  <span className="text-purple-400">{flow.grid_to_load_kw.toFixed(1)} kW</span>
                </div>
              )}
            </div>
          </div>

          {/* Utility Grid Interconnection Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 shadow-lg shadow-purple-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <UtilityPole className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Utility Grid (DISCOM)</div>
                  <div className="text-[11px] text-purple-400/80 font-mono">₹{telemetry.grid_tariff_inr.toFixed(2)} / kWh</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-purple-400">
                  {isImporting ? `+${grid_import_kw.toFixed(1)}` : isExporting ? `-${grid_export_kw.toFixed(1)}` : '0.0'} kW
                </div>
                <div className="text-[10px] text-slate-400">{telemetry.grid_status}</div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Rate:</span>
                <span className="text-slate-300">
                  {telemetry.current_cost_rate_inr_per_hr > 0 ? `₹${telemetry.current_cost_rate_inr_per_hr.toFixed(2)}/h` : '₹0.00/h'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Grid Carbon Intensity:</span>
                <span className="text-slate-300">710 gCO₂/kWh</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
